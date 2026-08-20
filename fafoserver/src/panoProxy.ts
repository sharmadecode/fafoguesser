import { randomUUID } from "node:crypto";
import { ENV } from "./config.js";

// Panorama proxy. Clients never learn a Mapillary image id (that would leak
// coords through Mapillary's public metadata). Each round mints an opaque,
// expiring key; GET /api/pano/:key serves the image bytes. Keys only resolve
// to ids minted server-side, so user input can't reach the upstream (no SSRF).
// The graph API turns an id into a thumbnail URL, then the proxy caches the
// bytes so clients never touch Mapillary directly.

const KEY_TTL_MS = 120_000; // covers round + reveal pause + margin
const IMAGE_TTL_MS = 300_000; // bytes may outlive the key window
const GRAPH_TIMEOUT_MS = 6_000;
const FETCH_TIMEOUT_MS = 45_000; // original-res panoramas are large/slow
const MAX_BYTES = 48 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 6;
// Keep cached bytes small enough not to OOM Render's 512 MB free tier.
const MAX_CACHE_BYTES = 96 * 1024 * 1024;
// Cap concurrent upstream downloads so quick-play spam can't spawn dozens of
// parallel 8-48MB fetches; beyond the queue, new requests are dropped.
const UPSTREAM_MAX_CONCURRENCY = 4;
const UPSTREAM_MAX_INFLIGHT_BYTES = 64 * 1024 * 1024;
const UPSTREAM_MAX_QUEUED = 32;
const IMAGE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

let activeUpstream = 0;
let inFlightBytes = 0;
const upstreamQueue: Array<() => void> = [];

function acquireUpstream(): Promise<boolean> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeUpstream < UPSTREAM_MAX_CONCURRENCY) {
        activeUpstream++;
        resolve(true);
      } else if (upstreamQueue.length >= UPSTREAM_MAX_QUEUED) {
        resolve(false);
      } else {
        upstreamQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseUpstream(bytes: number): void {
  activeUpstream--;
  inFlightBytes = Math.max(0, inFlightBytes - bytes);
  const next = upstreamQueue.shift();
  if (next) next();
}

/** Read a body chunk-by-chunk, aborting the stream the moment it exceeds
 *  MAX_BYTES or would push total in-flight bytes over the budget — an
 *  oversized/many download must not be fully buffered on the free tier. */
export async function readBodyCapped(
  res: Response,
  byteCounter: { value: number },
): Promise<Buffer | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES || inFlightBytes + value.byteLength > UPSTREAM_MAX_INFLIGHT_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      inFlightBytes += value.byteLength;
      byteCounter.value += value.byteLength;
      chunks.push(Buffer.from(value));
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks);
}

interface KeyEntry {
  imageId: string;
  expiresAt: number;
}

interface ImageEntry {
  buf: Buffer;
  contentType: string;
  expiresAt: number;
  size: number;
}

const keys = new Map<string, KeyEntry>();
const cache = new Map<string, ImageEntry>();
const inFlight = new Map<string, Promise<{ buf: Buffer; contentType: string } | null>>();
// imageId → last failure time; repeated rounds on a broken image must not
// re-hit the upstream (and the 512MB box) until the window rolls over.
const failedAt = new Map<string, number>();
const NEGATIVE_TTL_MS = 30_000;

/** Mint an opaque key for a round's panorama. */
export function mintKey(imageId: string): string {
  // Lazy sweep: prune expired keys while minting (they're otherwise only
  // deleted on access, which leaks for keys nobody ever fetches).
  if (keys.size > 64) {
    const now = Date.now();
    for (const [k, v] of keys) {
      if (now >= v.expiresAt) keys.delete(k);
    }
  }
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
  variant: "original" | "2048" = "original",
): Promise<{ buf: Buffer; contentType: string } | null> {
  if (!ENV.MAPILLARY_TOKEN || !IMAGE_ID_RE.test(imageId)) return null;
  // Global gate: at most 4 upstream pipelines (graph + bytes) in flight,
  // with a bounded wait queue — drop instead of piling up beyond it.
  if (!(await acquireUpstream())) {
    console.warn(`[pano] upstream queue full, dropping request`);
    return null;
  }
  const byteCounter = { value: 0 };
  try {
    // 1) Resolve the CURRENT signed thumbnail URL(s) for this image (v4 API:
    //    URLs are dynamic and expire, so this lookup cannot be skipped). Request
    //    every resolution and prefer the requested variant order.
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
    if (!apiRes || !apiRes.ok) {
      console.warn(`[pano] graph lookup failed (status=${apiRes?.status ?? "timeout"})`);
      return null;
    }
    const json = (await apiRes.json()) as Record<string, unknown>;
    const origUrl = typeof json.thumb_original_url === "string" ? json.thumb_original_url : "";
    const url2048 = typeof json.thumb_2048_url === "string" ? json.thumb_2048_url : "";
    const candidates = (
      variant === "2048" ? [url2048, origUrl] : [origUrl, url2048]
    ).filter((u): u is string => u.startsWith("https://"));

    for (const thumbUrl of candidates) {
      // Each candidate streams independently: reset the counter so the
      // in-flight byte accounting and the release below never double-count
      // bytes from an earlier (skipped/aborted) candidate.
      byteCounter.value = 0;
      const res = await fetch(thumbUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const len = Number(res.headers.get("content-length") ?? 0);
      if (Number.isFinite(len) && len > MAX_BYTES) {
        console.warn(`[pano] oversized original skipped (len=${len})`);
        continue; // skip oversized
      }
      // Stream with per-fetch + global in-flight byte caps (aborts early
      // instead of buffering 48 MB before checking).
      const buf = await readBodyCapped(res, byteCounter);
      if (buf && buf.length > 0) return { buf, contentType };
      console.warn(`[pano] stream aborted (per-fetch or in-flight byte cap)`);
    }
    console.warn(`[pano] no usable thumbnail`);
    return null;
  } catch {
    return null;
  } finally {
    releaseUpstream(byteCounter.value);
  }
}

function evictIfNeeded(): void {
  // Drop expired entries first (they're only removed lazily on lookup
  // otherwise), then evict the oldest insertions while still over the cap —
  // both by entry count and by total bytes, so the cache can never balloon
  // past the memory budget on the free tier.
  const now = Date.now();
  const expired: string[] = [];
  for (const [k, v] of cache) {
    if (now >= v.expiresAt) expired.push(k);
  }
  for (const k of expired) cache.delete(k);

  // Prune expired negative cache entries
  for (const [k, ts] of failedAt) {
    if (now - ts >= NEGATIVE_TTL_MS) failedAt.delete(k);
  }

  let total = 0;
  for (const v of cache.values()) total += v.size;
  while (cache.size >= MAX_CACHE_ENTRIES || total > MAX_CACHE_BYTES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const entry = cache.get(oldest);
    cache.delete(oldest);
    if (entry) total -= entry.size;
  }
}

/** Get the panorama bytes for an image id: cached, then single-flight fetch. */
export function getPanorama(
  imageId: string,
  variant: "original" | "2048" = "original",
): Promise<{ buf: Buffer; contentType: string } | null> {
  const cacheKey = `${imageId}#${variant}`;
  // Negative cache: an image that just failed (bad id, API outage, abort) is
  // not worth hammering again within the window — repeated round starts would
  // otherwise re-hit the upstream for the same broken image.
  const failed = failedAt.get(cacheKey);
  if (failed && Date.now() - failed < NEGATIVE_TTL_MS) return Promise.resolve(null);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached);
  if (cached) cache.delete(cacheKey);
  const pending =
    inFlight.get(cacheKey) ??
    fetchFromMapillary(imageId, variant)
      .then((result) => {
        if (result) {
          cache.set(cacheKey, {
            ...result,
            expiresAt: Date.now() + IMAGE_TTL_MS,
            size: result.buf.length,
          });
          evictIfNeeded();
          failedAt.delete(cacheKey);
        } else {
          failedAt.set(cacheKey, Date.now());
        }
        return result;
      })
      .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, pending);
  return pending;
}

/** Kick off the image fetch at round start so the first client request is instant. */
export function warmPanorama(imageId: string): void {
  if (!IMAGE_ID_RE.test(imageId)) return;
  void getPanorama(imageId, "2048");
  void getPanorama(imageId, "original");
}

/**
 * Await a single-flight fetch only briefly (bounded), so a round can verify
 * its panorama is actually servable BEFORE starting. Resolves true when the
 * bytes are cached or arrive within the budget; the fetch keeps running in
 * the background either way, so a later client request still gets the bytes.
 */
export async function warmPanoramaVerified(
  imageId: string,
  timeoutMs: number,
): Promise<boolean> {
  if (!IMAGE_ID_RE.test(imageId)) return false;
  const cached = cache.get(`${imageId}#2048`) || cache.get(`${imageId}#original`);
  if (cached && Date.now() < cached.expiresAt) return true;
  const pending = getPanorama(imageId, "2048");
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), timeoutMs);
    pending
      .then((r) => {
        clearTimeout(t);
        resolve(Boolean(r));
      })
      .catch(() => {
        clearTimeout(t);
        resolve(false);
      });
  });
}

/** Purge a panorama's cached bytes on round reveal or match teardown so
 *  unneeded multi-megabyte images don't linger on memory-constrained tiers. */
export function evictPano(imageId: string): void {
  cache.delete(`${imageId}#original`);
  cache.delete(`${imageId}#2048`);
}
