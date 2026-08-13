import { randomUUID } from "node:crypto";
import { ENV } from "./config.js";

// Panorama proxy. Clients never learn a Mapillary image id (which would leak
// the exact coordinates via Mapillary's public metadata). Instead each round
// mints an opaque, expiring key; GET /api/pano/:key returns the image bytes.
// Keys only resolve to image ids minted server-side, so user input can never
// reach the upstream URL (no SSRF, no path traversal).
//
// Since Mapillary API v4, thumbnail URLs are dynamic (signed, expiring) and
// must be looked up per image via the graph API (fields=thumb_2048_url); the
// hardcoded images.mapillary.com host no longer exists. The proxy does that
// lookup server-side and caches the BYTES, so clients never touch the API.

const KEY_TTL_MS = 120_000; // 30s round + 10s reveal pause + margin
const IMAGE_TTL_MS = 300_000; // cached bytes may outlive the key window
const GRAPH_TIMEOUT_MS = 6_000;
const FETCH_TIMEOUT_MS = 45_000; // original-res panoramas can be large/slow
const MAX_BYTES = 48 * 1024 * 1024; // full original quality cap
const MAX_CACHE_ENTRIES = 6; // bounded because original-res entries are large
const IMAGE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

interface KeyEntry {
  imageId: string;
  expiresAt: number;
}

interface ImageEntry {
  buf: Buffer;
  contentType: string;
  expiresAt: number;
}

const keys = new Map<string, KeyEntry>();
const cache = new Map<string, ImageEntry>();
const inFlight = new Map<string, Promise<{ buf: Buffer; contentType: string } | null>>();

/** Mint an opaque key for a round's panorama. */
export function mintKey(imageId: string): string {
  const key = randomUUID();
  keys.set(key, { imageId, expiresAt: Date.now() + KEY_TTL_MS });
  return key;
}

/** Resolve a client-supplied key to its image id, or null if unknown/expired. */
export function resolveKey(key: string): string | null {
  const entry = keys.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    keys.delete(key);
    return null;
  }
  return entry.imageId;
}

async function fetchFromMapillary(
  imageId: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  if (!ENV.MAPILLARY_TOKEN || !IMAGE_ID_RE.test(imageId)) return null;
  try {
    // 1) Resolve the CURRENT signed thumbnail URL(s) for this image (v4 API:
    //    URLs are dynamic and expire, so this lookup cannot be skipped). Request
    //    every resolution and prefer the HIGHEST available for max quality.
    const apiUrl = new URL("https://graph.mapillary.com/" + encodeURIComponent(imageId));
    apiUrl.searchParams.set("access_token", ENV.MAPILLARY_TOKEN);
    apiUrl.searchParams.set("fields", "thumb_original_url,thumb_2048_url");
    // Retry the graph lookup on transient 500s (Mapillary free tier rate-limits
    // under burst load from the location picker) before giving up.
    let apiRes: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS) });
        if (r.ok || r.status !== 500) { apiRes = r; break; }
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
      } catch {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
    if (!apiRes || !apiRes.ok) return null;
    const json = (await apiRes.json()) as Record<string, unknown>;
    // Prefer the FULL ORIGINAL upload (max Mapillary quality); Mapillary's
    // 4096/8192 thumbnails aren't available on this image/plan (they 500), so
    // fall back to the 2048 thumbnail. Track content-length to abort oversized
    // original downloads cheaply instead of buffering tens of MB first.
    const candidates = [
      typeof json.thumb_original_url === "string" ? json.thumb_original_url : "",
      typeof json.thumb_2048_url === "string" ? json.thumb_2048_url : "",
    ].filter((u): u is string => u.startsWith("https://"));

    for (const thumbUrl of candidates) {
      const res = await fetch(thumbUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const len = Number(res.headers.get("content-length") ?? 0);
      if (Number.isFinite(len) && len > MAX_BYTES) continue; // skip oversized
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_BYTES) continue;
      return { buf, contentType };
    }
    return null;
  } catch {
    return null;
  }
}

function evictIfNeeded(): void {
  // Drop expired entries first (they're only removed lazily on lookup
  // otherwise), then evict the oldest insertion if still over the cap.
  const now = Date.now();
  const expired: string[] = [];
  for (const [k, v] of cache) {
    if (now >= v.expiresAt) expired.push(k);
  }
  for (const k of expired) cache.delete(k);
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Get the panorama bytes for an image id: cached, then single-flight fetch. */
export function getPanorama(
  imageId: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const cached = cache.get(imageId);
  if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached);
  if (cached) cache.delete(imageId);
  const pending =
    inFlight.get(imageId) ??
    fetchFromMapillary(imageId)
      .then((result) => {
        if (result) {
          cache.set(imageId, { ...result, expiresAt: Date.now() + IMAGE_TTL_MS });
          evictIfNeeded();
        }
        return result;
      })
      .finally(() => inFlight.delete(imageId));
  inFlight.set(imageId, pending);
  return pending;
}

/** Kick off the image fetch at round start so the first client request is instant. */
export function warmPanorama(imageId: string): void {
  if (!IMAGE_ID_RE.test(imageId)) return;
  void getPanorama(imageId);
}


