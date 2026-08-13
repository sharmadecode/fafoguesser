import { useEffect, useState } from "react";

/** Self-contained ticking clock so only the component that displays a
 *  countdown re-renders — not the whole app tree. The old design lifted `now`
 *  to <App> and updated it every 100ms, which re-rendered the Leaflet map 10×
 *  per second. This hook ticks internally at `intervalMs` (default 250ms, fine
 *  for a countdown) and returns the current server epoch ms via `serverNow`.
 *
 *  `serverNow` should be a stable function (e.g. bound once with useCallback)
 *  so the interval isn't reset on every parent render. */
export function useNow(serverNow: () => number, intervalMs = 250): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    setNow(serverNow());
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverNow, intervalMs]);
  return now;
}
