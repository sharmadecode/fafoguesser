// Pano keys are opaque server-minted UUIDs; anything else is path junk and
// must never reach /api/pano (Android enforces the same rule in
// PanoramaWebView).
const PANO_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function validPanoKey(key: string): boolean {
  return PANO_KEY_RE.test(key);
}