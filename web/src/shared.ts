// Use `||` (not `??`): an EMPTY VITE_SERVER_URL (the committed .env default)
// must fall through to the origin fallback. With `??`, an empty string would
// be treated as a valid URL and the game would connect same-origin and die.
export const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

export const TIPS = [
  "Drag the street view to look around",
  "Pinch or double-tap to zoom",
  "Tap the map to drop your pin",
  "Your last pin auto-submits at the buzzer",
];
