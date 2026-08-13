interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();
let callsSincePrune = 0;

export function rateLimit(
  ip: string,
  key: string,
  max: number,
  windowMs: number,
): boolean {
  if (callsSincePrune++ > 10_000) {
    prune();
    callsSincePrune = 0;
  }
  const bucketKey = `${ip}:${key}`;
  const now = Date.now();
  const b = buckets.get(bucketKey);
  if (!b || now - b.windowStart > windowMs) {
    buckets.set(bucketKey, { windowStart: now, count: 1 });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

function prune() {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.windowStart > 60_000) buckets.delete(k);
  }
}
