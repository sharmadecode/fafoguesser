import { ENV } from "./config.js";

export interface PickedLocation {
  imageId: string;
  lat: number;
  lng: number;
}

interface Region {
  name: string;
  lat: number;
  lng: number;
  spanLat: number;
  spanLng: number;
}

// Curated areas with good Mapillary coverage. Coords are region centers;
// a random point is picked inside each span.
const REGIONS: Region[] = [
  { name: "San Francisco", lat: 37.77, lng: -122.42, spanLat: 0.3, spanLng: 0.3 },
  { name: "Los Angeles", lat: 34.05, lng: -118.25, spanLat: 0.4, spanLng: 0.4 },
  { name: "New York", lat: 40.71, lng: -74.0, spanLat: 0.3, spanLng: 0.3 },
  { name: "Seattle", lat: 47.6, lng: -122.33, spanLat: 0.3, spanLng: 0.3 },
  { name: "Portland", lat: 45.52, lng: -122.68, spanLat: 0.25, spanLng: 0.25 },
  { name: "Denver", lat: 39.74, lng: -104.99, spanLat: 0.3, spanLng: 0.3 },
  { name: "Austin", lat: 30.27, lng: -97.74, spanLat: 0.3, spanLng: 0.3 },
  { name: "Chicago", lat: 41.88, lng: -87.63, spanLat: 0.3, spanLng: 0.3 },
  { name: "Boston", lat: 42.36, lng: -71.06, spanLat: 0.25, spanLng: 0.25 },
  { name: "Miami", lat: 25.76, lng: -80.19, spanLat: 0.3, spanLng: 0.3 },
  { name: "Washington DC", lat: 38.9, lng: -77.04, spanLat: 0.25, spanLng: 0.25 },
  { name: "Toronto", lat: 43.65, lng: -79.38, spanLat: 0.3, spanLng: 0.3 },
  { name: "Montreal", lat: 45.5, lng: -73.57, spanLat: 0.3, spanLng: 0.3 },
  { name: "Vancouver", lat: 49.28, lng: -123.12, spanLat: 0.25, spanLng: 0.25 },
  { name: "Mexico City", lat: 19.43, lng: -99.13, spanLat: 0.3, spanLng: 0.3 },
  { name: "London", lat: 51.5, lng: -0.12, spanLat: 0.3, spanLng: 0.3 },
  { name: "Paris", lat: 48.86, lng: 2.35, spanLat: 0.3, spanLng: 0.3 },
  { name: "Berlin", lat: 52.52, lng: 13.4, spanLat: 0.3, spanLng: 0.3 },
  { name: "Hamburg", lat: 53.55, lng: 9.99, spanLat: 0.25, spanLng: 0.25 },
  { name: "Munich", lat: 48.14, lng: 11.58, spanLat: 0.25, spanLng: 0.25 },
  { name: "Madrid", lat: 40.42, lng: -3.7, spanLat: 0.3, spanLng: 0.3 },
  { name: "Barcelona", lat: 41.39, lng: 2.17, spanLat: 0.25, spanLng: 0.25 },
  { name: "Lisbon", lat: 38.72, lng: -9.14, spanLat: 0.25, spanLng: 0.25 },
  { name: "Rome", lat: 41.9, lng: 12.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Milan", lat: 45.46, lng: 9.19, spanLat: 0.25, spanLng: 0.25 },
  { name: "Venice", lat: 45.44, lng: 12.32, spanLat: 0.15, spanLng: 0.15 },
  { name: "Amsterdam", lat: 52.37, lng: 4.9, spanLat: 0.25, spanLng: 0.25 },
  { name: "Brussels", lat: 50.85, lng: 4.35, spanLat: 0.2, spanLng: 0.2 },
  { name: "Zurich", lat: 47.38, lng: 8.54, spanLat: 0.2, spanLng: 0.2 },
  { name: "Geneva", lat: 46.2, lng: 6.14, spanLat: 0.15, spanLng: 0.15 },
  { name: "Vienna", lat: 48.21, lng: 16.37, spanLat: 0.25, spanLng: 0.25 },
  { name: "Prague", lat: 50.08, lng: 14.44, spanLat: 0.25, spanLng: 0.25 },
  { name: "Warsaw", lat: 52.23, lng: 21.01, spanLat: 0.3, spanLng: 0.3 },
  { name: "Copenhagen", lat: 55.68, lng: 12.57, spanLat: 0.2, spanLng: 0.2 },
  { name: "Stockholm", lat: 59.33, lng: 18.07, spanLat: 0.3, spanLng: 0.3 },
  { name: "Oslo", lat: 59.91, lng: 10.75, spanLat: 0.25, spanLng: 0.25 },
  { name: "Helsinki", lat: 60.17, lng: 24.94, spanLat: 0.25, spanLng: 0.25 },
  { name: "Dublin", lat: 53.35, lng: -6.26, spanLat: 0.2, spanLng: 0.2 },
  { name: "Budapest", lat: 47.5, lng: 19.04, spanLat: 0.25, spanLng: 0.25 },
  { name: "Athens", lat: 37.98, lng: 23.73, spanLat: 0.25, spanLng: 0.25 },
  { name: "Istanbul", lat: 41.01, lng: 28.98, spanLat: 0.3, spanLng: 0.3 },
  { name: "Tokyo", lat: 35.68, lng: 139.69, spanLat: 0.4, spanLng: 0.4 },
  { name: "Osaka", lat: 34.69, lng: 135.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Kyoto", lat: 35.01, lng: 135.77, spanLat: 0.2, spanLng: 0.2 },
  { name: "Seoul", lat: 37.57, lng: 126.98, spanLat: 0.3, spanLng: 0.3 },
  { name: "Busan", lat: 35.18, lng: 129.08, spanLat: 0.25, spanLng: 0.25 },
  { name: "Singapore", lat: 1.35, lng: 103.82, spanLat: 0.3, spanLng: 0.3 },
  { name: "Hong Kong", lat: 22.32, lng: 114.17, spanLat: 0.25, spanLng: 0.25 },
  { name: "Taipei", lat: 25.03, lng: 121.57, spanLat: 0.25, spanLng: 0.25 },
  { name: "Bangkok", lat: 13.76, lng: 100.5, spanLat: 0.3, spanLng: 0.3 },
  { name: "Kuala Lumpur", lat: 3.14, lng: 101.69, spanLat: 0.3, spanLng: 0.3 },
  { name: "Jakarta", lat: -6.21, lng: 106.85, spanLat: 0.3, spanLng: 0.3 },
  { name: "Sydney", lat: -33.87, lng: 151.21, spanLat: 0.4, spanLng: 0.4 },
  { name: "Melbourne", lat: -37.81, lng: 144.96, spanLat: 0.35, spanLng: 0.35 },
  { name: "Brisbane", lat: -27.47, lng: 153.03, spanLat: 0.3, spanLng: 0.3 },
  { name: "Perth", lat: -31.95, lng: 115.86, spanLat: 0.3, spanLng: 0.3 },
  { name: "Auckland", lat: -36.85, lng: 174.76, spanLat: 0.3, spanLng: 0.3 },
  { name: "Wellington", lat: -41.29, lng: 174.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Sao Paulo", lat: -23.55, lng: -46.63, spanLat: 0.4, spanLng: 0.4 },
  { name: "Rio de Janeiro", lat: -22.91, lng: -43.17, spanLat: 0.35, spanLng: 0.35 },
  { name: "Buenos Aires", lat: -34.6, lng: -58.38, spanLat: 0.35, spanLng: 0.35 },
  { name: "Santiago", lat: -33.45, lng: -70.67, spanLat: 0.3, spanLng: 0.3 },
  { name: "Lima", lat: -12.05, lng: -77.04, spanLat: 0.3, spanLng: 0.3 },
  { name: "Bogota", lat: 4.71, lng: -74.07, spanLat: 0.3, spanLng: 0.3 },
  { name: "Mumbai", lat: 19.08, lng: 72.88, spanLat: 0.3, spanLng: 0.3 },
  { name: "Delhi", lat: 28.7, lng: 77.1, spanLat: 0.3, spanLng: 0.3 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59, spanLat: 0.3, spanLng: 0.3 },
  { name: "Chennai", lat: 13.08, lng: 80.27, spanLat: 0.25, spanLng: 0.25 },
  { name: "Kolkata", lat: 22.57, lng: 88.36, spanLat: 0.25, spanLng: 0.25 },
  { name: "Hyderabad", lat: 17.39, lng: 78.49, spanLat: 0.3, spanLng: 0.3 },
  { name: "Dubai", lat: 25.2, lng: 55.27, spanLat: 0.3, spanLng: 0.3 },
  { name: "Abu Dhabi", lat: 24.45, lng: 54.38, spanLat: 0.25, spanLng: 0.25 },
  { name: "Tel Aviv", lat: 32.09, lng: 34.78, spanLat: 0.2, spanLng: 0.2 },
  { name: "Johannesburg", lat: -26.2, lng: 28.05, spanLat: 0.35, spanLng: 0.35 },
  { name: "Cape Town", lat: -33.92, lng: 18.42, spanLat: 0.35, spanLng: 0.35 },
  { name: "Nairobi", lat: -1.29, lng: 36.82, spanLat: 0.3, spanLng: 0.3 },
  { name: "Cairo", lat: 30.04, lng: 31.24, spanLat: 0.3, spanLng: 0.3 },
  { name: "Tunis", lat: 36.81, lng: 10.18, spanLat: 0.2, spanLng: 0.2 },
  { name: "Casablanca", lat: 33.57, lng: -7.59, spanLat: 0.25, spanLng: 0.25 },
];

// Used when MAPILLARY_TOKEN is empty so the full game flow can be tested
// without network access. imageId values are placeholders.
const TEST_LOCATIONS: PickedLocation[] = [
  { imageId: "test-loc-1", lat: 48.8584, lng: 2.2945 },
  { imageId: "test-loc-2", lat: 40.7484, lng: -73.9857 },
  { imageId: "test-loc-3", lat: 35.6586, lng: 139.7454 },
  { imageId: "test-loc-4", lat: -33.8568, lng: 151.2153 },
  { imageId: "test-loc-5", lat: 19.076, lng: 72.8777 },
];

// Verified real panoramas (San Francisco). Served only when the live
// Mapillary search exhausts every batch (full API outage), so a match never
// hands out a placeholder location. NOTE: these all sit in one SF block —
// during a total outage the panorama proxy also can't fetch bytes (same API),
// so the image won't render regardless; the coords here only drive the reveal
// truth. Diversifying across cities needs API-verified panorama ids, which
// can't be confirmed without live access, so the verified set is kept intact
// rather than guessing unverified ids (which would silently 404).
const REAL_FALLBACKS: PickedLocation[] = [
  { imageId: "1942579696527289", lat: 37.775048, lng: -122.419506 },
  { imageId: "1835899807362241", lat: 37.775049, lng: -122.419506 },
  { imageId: "1999592430876118", lat: 37.775031, lng: -122.419479 },
  { imageId: "776652771404561", lat: 37.775035, lng: -122.419521 },
];

const MAPILLARY_FIELDS = "id,computed_geometry,is_pano,width,height";

interface MapillaryImage {
  id?: unknown;
  computed_geometry?: { coordinates?: unknown };
  is_pano?: unknown;
  width?: unknown;
  height?: unknown;
}

function randomPoint(region: Region): { lat: number; lng: number } {
  return {
    lat: region.lat + (Math.random() - 0.5) * region.spanLat,
    lng: region.lng + (Math.random() - 0.5) * region.spanLng,
  };
}

async function fetchImages(params: Record<string, string>): Promise<MapillaryImage[]> {
  const url = new URL("https://graph.mapillary.com/images");
  url.searchParams.set("access_token", ENV.MAPILLARY_TOKEN);
  url.searchParams.set("fields", MAPILLARY_FIELDS);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: MapillaryImage[] };
    return json.data ?? [];
  } catch {
    // Timeout / network error: treat as "no images here" so the caller
    // retries the next region instead of crashing the round.
    return [];
  }
}

function toPicked(img: MapillaryImage | undefined): PickedLocation | null {
  const coords = img?.computed_geometry?.coordinates;
  if (!img?.id || !Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { imageId: String(img.id), lat, lng };
}

// Maps only render equirectangular images (width = 2x height). Accepts
// is_pano flags OR anything that looks equirectangular — a strict
// is_pano-only filter is redundant since it's a subset of this one.
async function searchRadius(lat: number, lng: number): Promise<PickedLocation | null> {
  const images = await fetchImages({
    lat: String(lat.toFixed(5)),
    lng: String(lng.toFixed(5)),
    radius: "50",
    limit: "100",
  });
  const equirect = images.find((i) => {
    const w = Number(i.width);
    const h = Number(i.height);
    return i.is_pano === true || (w > 2000 && w === 2 * h);
  });
  return toPicked(equirect);
}

let pickerOverride: (() => Promise<PickedLocation>) | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Test hook: force a deterministic location picker. */
export function __overridePicker(fn: (() => Promise<PickedLocation>) | null): void {
  pickerOverride = fn;
}

// Panoramic imagery clusters a few hundred metres off city-center grid
// points, so each attempt probes the point plus nearby offsets.
const OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0.002, 0.002],
  [0.0035, -0.002],
  [-0.002, 0.0035],
];

async function searchBatch(
  count: number,
  finder: (lat: number, lng: number) => Promise<PickedLocation | null>,
): Promise<PickedLocation | null> {
  const points = Array.from({ length: count }, () => {
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const { lat, lng } = randomPoint(region);
    return OFFSETS.map(([dlat, dlng]) => ({ lat: lat + dlat, lng: lng + dlng }));
  }).flat();
  const results = await Promise.all(points.map((p) => finder(p.lat, p.lng)));
  return results.find(Boolean) ?? null;
}

// Pre-warmed pool so the FIRST round of a match starts instantly instead of
// waiting on the Mapillary API (~15s). pickRandomLocation pulls from the pool
// and refills in the background; initLocationPool warms it at server startup.
const pool: PickedLocation[] = [];
let warming = false;

async function fillPool(target: number): Promise<void> {
  if (warming || pool.length >= target) return;
  warming = true;
  try {
    while (pool.length < target) {
      const loc = await pickRandomLocationLive();
      if (loc) pool.push(loc);
    }
  } finally {
    warming = false;
  }
}

export function initLocationPool(target = 3): void {
  if (!ENV.MAPILLARY_TOKEN) {
    // Test/dev mode: the picker is instant, so just seed the pool directly.
    for (let i = 0; i < target; i++) {
      pool.push(TEST_LOCATIONS[Math.floor(Math.random() * TEST_LOCATIONS.length)]);
    }
    return;
  }
  void fillPool(target);
}

export async function pickRandomLocation(): Promise<PickedLocation> {
  if (pickerOverride) return pickerOverride();
  const warmed = pool.shift();
  if (warmed) {
    void fillPool(3); // keep it topped up in the background
    return warmed;
  }
  return pickRandomLocationLive();
}

async function pickRandomLocationLive(): Promise<PickedLocation> {
  if (pickerOverride) return pickerOverride();
  if (!ENV.MAPILLARY_TOKEN) {
    return TEST_LOCATIONS[Math.floor(Math.random() * TEST_LOCATIONS.length)];
  }
  // Radius-only search (bbox queries are unusably slow on the Mapillary API).
  // Searches run concurrently (pano imagery is block-specific, so a batch of
  // scattered points finds a hit quickly); batches are paced to stay under
  // the API rate limit (rapid back-to-back requests return 500s).
  for (let batch = 0; batch < 6; batch++) {
    const found = await searchBatch(3, searchRadius);
    if (found) return found;
    await sleep(500);
  }
  return REAL_FALLBACKS[Math.floor(Math.random() * REAL_FALLBACKS.length)];
}
