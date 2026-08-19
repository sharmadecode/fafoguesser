import { memo, useEffect, useRef, useState } from "react";
import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";
import { validPanoKey } from "../panoKey";
import { SERVER_URL } from "../shared";
import { useRotatingTip } from "../hooks/useRotatingTip";

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

function getMaxTextureSize(): number {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl) {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (typeof max === "number" && max > 0) return max;
    }
  } catch {
    /* ignore */
  }
  return 4096;
}

let cachedMaxTextureSize: number | null = null;

async function preparePanoBlob(rawBlob: Blob): Promise<Blob> {
  try {
    if (cachedMaxTextureSize === null) {
      cachedMaxTextureSize = getMaxTextureSize();
    }
    const maxDim = cachedMaxTextureSize;

    let width = 0;
    let height = 0;
    let bitmap: ImageBitmap | null = null;
    let img: HTMLImageElement | null = null;
    let tempUrlToRevoke: string | null = null;

    try {
      if (typeof createImageBitmap === "function") {
        bitmap = await createImageBitmap(rawBlob);
        width = bitmap.width;
        height = bitmap.height;
      }
    } catch {
      bitmap = null;
    }

    if (!bitmap) {
      img = new Image();
      tempUrlToRevoke = URL.createObjectURL(rawBlob);
      await new Promise<void>((resolve, reject) => {
        img!.onload = () => resolve();
        img!.onerror = reject;
        img!.src = tempUrlToRevoke!;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
    }

    if (width <= maxDim && height <= maxDim) {
      bitmap?.close();
      if (tempUrlToRevoke) URL.revokeObjectURL(tempUrlToRevoke);
      return rawBlob;
    }

    const scale = Math.min(maxDim / width, maxDim / height);
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap?.close();
      if (tempUrlToRevoke) URL.revokeObjectURL(tempUrlToRevoke);
      return rawBlob;
    }

    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close();
    } else if (img) {
      ctx.drawImage(img, 0, 0, targetW, targetH);
      if (tempUrlToRevoke) URL.revokeObjectURL(tempUrlToRevoke);
    }

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob || rawBlob);
        },
        "image/jpeg",
        0.92,
      );
    });
  } catch (err) {
    console.warn("[pano] preparePanoBlob fallback to raw:", err);
    return rawBlob;
  }
}

// Secure 360° viewer: fetches the proxied equirectangular bytes from
// /api/pano/:key (so no Mapillary token or image id ever reaches the browser)
// and renders them with Pannellum as a draggable, zoomable sphere. While
// loading, rotating tips replace the bare spinner; failures offer a retry.
export const PanoramaViewer = memo(function PanoramaViewer({ panoKey }: { panoKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const tip = useRotatingTip(undefined, 3200, status === "loading");

  useEffect(() => {
    // Keys are opaque server UUIDs; reject anything else before it reaches
    // /api/pano (Android enforces the same rule in PanoramaWebView).
    if (!validPanoKey(panoKey)) {
      setStatus("error");
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    const factory = window.pannellum;
    if (!factory) {
      setStatus("error");
      return;
    }

    const abortController = new AbortController();
    let viewer: PanoViewerHandle | null = null;
    let cancelled = false;

    (async () => {
      try {
        const maxTex = cachedMaxTextureSize ?? getMaxTextureSize();
        const isSmallScreen = typeof window !== "undefined" && window.innerWidth <= 900;
        const sizeParam = (maxTex <= 4096 || isSmallScreen) ? "?size=2048" : "";
        const sep = sizeParam ? "&" : "?";
        const cacheBuster = retryNonce > 0 ? `${sep}r=${retryNonce}` : "";
        const res = await fetch(`${SERVER_URL}/api/pano/${panoKey}${sizeParam}${cacheBuster}`, {
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error("pano fetch failed");
        const rawBlob = await res.blob();
        if (cancelled) return;
        const safeBlob = await preparePanoBlob(rawBlob);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(safeBlob);
        objectUrlRef.current = objectUrl;
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrlRef.current = null;
          return;
        }
        viewer = factory.viewer(container, {
          type: "equirectangular",
          panorama: objectUrl,
          autoLoad: true,
          // No +/- buttons: pinch (touch) / drag with the wheel (desktop).
          showZoomCtrl: false,
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
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError" || cancelled) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      try {
        viewer?.destroy();
      } catch {
        /* ignore */
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [panoKey, retryNonce]);

  return (
    <div
      ref={containerRef}
      className="pano pano-stage"
      style={{ width: "100%", height: "100%" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {status === "loading" && (
        <>
          <div className="pano-placeholder">
            <div className="pano-placeholder-title">LOADING PANORAMA…</div>
            <div className="pano-placeholder-sub">Fetching street view</div>
          </div>
          <div className="pano-tips">
            <div className="pano-tips-spinner" />
            <div className="pano-tips-text">{tip}</div>
          </div>
        </>
      )}
      {status === "error" && (
        <div className="pano-error" role="alert">
          <div className="pano-error-title">PANORAMA UNAVAILABLE</div>
          <div className="pano-error-sub">The street view failed to load</div>
          <button className="pano-retry" onClick={() => setRetryNonce((n) => n + 1)}>
            RETRY
          </button>
        </div>
      )}
    </div>
  );
});