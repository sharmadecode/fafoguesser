import { useEffect } from "react";

const BASE = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:8787";

// Warm the browser cache for the next round's panorama while the current round
// plays, so the round transition loads instantly (the server pre-warps the bytes
// too). No Mapillary token or image id ever touches the client.
export function PanoPreloader({ panoKey }: { panoKey: string | null }) {
  useEffect(() => {
    if (!panoKey) return;
    const controller = new AbortController();
    fetch(`${BASE}/api/pano/${panoKey}`, { signal: controller.signal })
      .then((r) => r.blob())
      .catch(() => {});
    return () => controller.abort();
  }, [panoKey]);
  return null;
}
