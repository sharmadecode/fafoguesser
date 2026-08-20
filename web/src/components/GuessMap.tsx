import { memo, useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RoundRevealPayload } from "../types";

export interface Pick {
  lat: number;
  lng: number;
}

interface GuessMapProps {
  enabled: boolean;
  reveal: RoundRevealPayload | null;
  onPinPlace: (pick: Pick) => void;
  round: number;
}

const TILE_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

/** Truth marker: a red rectangular flag planted at the exact location.
 *  Red is no longer a player color, so it's unmistakable. */
function truthIcon(): L.DivIcon {
  const html = `
    <div class="map-pin pin-labeled truth-flag" style="--pin-color: #ef4444">
      <svg width="30" height="36" viewBox="0 0 30 36" xmlns="http://www.w3.org/2000/svg">
        <rect x="13" y="2" width="4" height="33" fill="#0e1116"/>
        <rect x="13" y="3" width="16" height="12" fill="#ef4444" stroke="#0e1116" stroke-width="2"/>
        <circle cx="15" cy="34" r="3" fill="#0e1116"/>
      </svg>
      <span class="pin-label">ACTUAL LOCATION</span>
    </div>`;
  return L.divIcon({
    className: "pin-marker",
    html,
    iconSize: [30, 36],
    iconAnchor: [15, 36],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeColor(c: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(c) ? c : "#84cc16";
}

/** Player pin with a name tag beside it (full-screen reveal). */
function pinIconLabeled(color: string, name: string): L.DivIcon {
  const safeColor = sanitizeColor(color);
  const safeName = escapeHtml(name);
  const html = `
    <div class="map-pin pin-labeled" style="--pin-color: ${safeColor}">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
              fill="${safeColor}" stroke="#0e1116" stroke-width="2"/>
        <circle cx="14" cy="13" r="5" fill="#0e1116"/>
      </svg>
      <span class="pin-label">${safeName}</span>
    </div>`;
  return L.divIcon({
    className: "pin-marker",
    html,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

/** Guess pin: dropped by tapping/clicking the map (no label — it's yours). */
function guessPinIcon(): L.DivIcon {
  const html = `
    <div class="map-pin" style="--pin-color: #f59e0b">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
              fill="#f59e0b" stroke="#0e1116" stroke-width="2"/>
        <circle cx="14" cy="13" r="5" fill="#0e1116"/>
      </svg>
    </div>`;
  return L.divIcon({
    className: "pin-marker",
    html,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

function normalizeLng(lng: number): number {
  return (((lng + 180) % 360) + 360) % 360 - 180;
}

export const GuessMap = memo(function GuessMap({ enabled, reveal, onPinPlace, round }: GuessMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const onPinPlaceRef = useRef(onPinPlace);
  onPinPlaceRef.current = onPinPlace;
  const [pin, setPin] = useState<Pick | null>(null);

  useEffect(() => {
    const div = divRef.current;
    if (!div || mapRef.current) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const map = L.map(div, {
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      fadeAnimation: false,
      zoomAnimation: true,
      minZoom: 1.5,
      maxBounds: [
        [-85, -360],
        [85, 360],
      ],
      maxBoundsViscosity: 1.0,
    }).setView([20, 0], 3);
    mapRef.current = map;
    if (TILE_KEY) {
      L.tileLayer(`https://api.maptiler.com/maps/hybrid-v4/{z}/{x}/{y}{r}.jpg?key=${TILE_KEY}`, {
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 20,
        maxNativeZoom: 19,
        keepBuffer: 4,
        updateWhenZooming: true,
        detectRetina: !isMobile,
      }).addTo(map);
    } else {
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        maxNativeZoom: 18,
        keepBuffer: 4,
        updateWhenZooming: true,
      }).addTo(map);
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Tap or click drops a PIN at the exact spot — that pin IS the guess
  // (pan/zoom first, then place it), on every device. Panning through the
  // world edge wraps the longitude; normalize it before it can become the
  // submitted guess.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (!enabled) return;
      const pick = { lat: e.latlng.lat, lng: normalizeLng(e.latlng.lng) };
      setPin(pick);
      onPinPlaceRef.current(pick);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [enabled]);

  // Render the guess pin (and drop it again each time it moves).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pinMarkerRef.current?.remove();
    pinMarkerRef.current = null;
    if (pin && !reveal) {
      pinMarkerRef.current = L.marker([pin.lat, pin.lng], { icon: guessPinIcon() }).addTo(map);
    }
  }, [pin, reveal]);

  // The map container resizes whenever the adaptive split animates, the
  // viewport changes (browser chrome, virtual keyboard), or the reveal
  // switches it to full screen — Leaflet must re-measure or tiles render
  // at the wrong resolution.
  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(div);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((layer) => layer.remove());
    markersRef.current = [];
    if (!reveal) return;

    // Immediately re-measure fullscreen dimensions before calculating bounds
    map.invalidateSize({ animate: false });

    // At reveal: show every player's guess pin + the truth location + lines,
    // zoomed to the bounds so everyone's guess is visible at once.
    const truthLatLng = L.latLng(reveal.location.lat, reveal.location.lng);
    const truth = L.marker(truthLatLng, { icon: truthIcon() }).addTo(map);
    markersRef.current.push(truth);

    const bounds = L.latLngBounds([truthLatLng]);

    for (const r of reveal.results) {
      if (r.lat == null || r.lng == null) continue;
      const guessLatLng = L.latLng(r.lat, r.lng);
      bounds.extend(guessLatLng);

      markersRef.current.push(
        L.marker(guessLatLng, { icon: pinIconLabeled(r.color, r.nickname) }).addTo(map),
      );

      markersRef.current.push(
        L.polyline(
          [
            [r.lat, r.lng],
            [reveal.location.lat, reveal.location.lng],
          ],
          { color: r.color, weight: 5, opacity: 1 },
        ).addTo(map),
      );
    }

    // Stay zoomed out to the bounds so every pin and line stays in view
    // for the whole reveal with a smooth glide animation.
    map.flyToBounds(bounds.pad(0.25), { duration: 1.1, maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  // The reveal zoomed the map in on the truth location; when the next round
  // starts, snap back to the small world view so everyone guesses blind again.
  const prevRoundRef = useRef(round);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || round === prevRoundRef.current) return;
    prevRoundRef.current = round;
    setPin(null);
    map.invalidateSize({ animate: false });
    map.setView([20, 0], 3);
  }, [round]);

  return (
    <div className={`guessmap-wrap${reveal ? " reveal-mode" : ""}`} onContextMenu={(e) => e.preventDefault()}>
      <div ref={divRef} className="guessmap" />
    </div>
  );
});