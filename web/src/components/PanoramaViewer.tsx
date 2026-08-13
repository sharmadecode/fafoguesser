import { useEffect, useRef, useState } from "react";
import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";

const BASE = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:8787";

interface PanoViewerHandle {
  destroy: () => void;
  on(event: "load", cb: () => void): void;
  on(event: "error", cb: (msg: string) => void): void;
}

// Pannellum's UMD build exposes the high-level viewer on window.pannellum.
declare global {
  interface Window {
    pannellum?: {
      viewer(
        container: string | HTMLElement,
        config: Record<string, unknown>,
      ): PanoViewerHandle;
    };
  }
}

// Secure 360° viewer: fetches the proxied equirectangular bytes from
// /api/pano/:key (so no Mapillary token or image id ever reaches the browser)
// and renders them with Pannellum as a draggable, zoomable sphere.
export function PanoramaViewer({ panoKey }: { panoKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !panoKey) return;
    setStatus("loading");
    const factory = window.pannellum;
    if (!factory) {
      setStatus("error");
      return;
    }
    let viewer: PanoViewerHandle | null = null;
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${BASE}/api/pano/${panoKey}`);
        if (!res.ok) throw new Error("pano fetch failed");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        viewer = factory.viewer(container, {
          type: "equirectangular",
          panorama: objectUrl,
          autoLoad: true,
          showZoomCtrl: true,
          showFullscreenCtrl: false,
          mouseZoom: true,
          draggable: true,
          keyboardZoom: true,
          friction: 0.15,
        });
        viewer.on("load", () => {
          if (!cancelled) setStatus("ready");
        });
        viewer.on("error", () => {
          if (!cancelled) setStatus("error");
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewer?.destroy();
      } catch {
        /* ignore */
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [panoKey]);

  return (
    <div ref={containerRef} className="pano pano-stage" style={{ width: "100%", height: "100%" }}>
      {status === "loading" && (
        <div className="pano-placeholder">
          <div className="pano-placeholder-title">LOADING PANORAMA…</div>
          <div className="pano-placeholder-sub">Fetching street view</div>
        </div>
      )}
      {status === "error" && (
        <div className="pano-placeholder">
          <div className="pano-placeholder-title">PANORAMA UNAVAILABLE</div>
          <div className="pano-placeholder-sub">Try the next round</div>
        </div>
      )}
    </div>
  );
}

