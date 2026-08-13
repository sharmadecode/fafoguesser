import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PlayerPublic, RoundRevealPayload } from "../types";

export interface Pick {
  lat: number;
  lng: number;
}

interface GuessMapProps {
  enabled: boolean;
  guess: Pick | null;
  reveal: RoundRevealPayload | null;
  onPick: (pick: Pick) => void;
  nickname: string;
  players: PlayerPublic[];
  submitted: boolean;
  round: number;
  onSubmitGuess: () => void;
}

const TILE_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

function pinIcon(color: string): L.DivIcon {
  const html = `
    <div class="map-pin" style="--pin-color: ${color}">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
              fill="${color}" stroke="#0e1116" stroke-width="2"/>
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

/** Build the "truth" marker: a red rectangular flag planted at the exact
 *  location. Red is no longer a player color, so it's unmistakable. */
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

/** Player pin with a name tag beside it (full-screen reveal). */
function pinIconLabeled(color: string, name: string): L.DivIcon {
  const html = `
    <div class="map-pin pin-labeled" style="--pin-color: ${color}">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
              fill="${color}" stroke="#0e1116" stroke-width="2"/>
        <circle cx="14" cy="13" r="5" fill="#0e1116"/>
      </svg>
      <span class="pin-label">${name}</span>
    </div>`;
  return L.divIcon({
    className: "pin-marker",
    html,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

export function GuessMap({ enabled, guess, reveal, onPick, nickname, players, submitted, round, onSubmitGuess }: GuessMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [expanded, setExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Touch devices have no hover — the map stays expanded so pinning is
  // usable with one finger on any browser (phone/tablet).
  const coarseRef = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches,
  );

  // Player colors change only on join/rejoin; track them by signature so
  // marker rebuilds don't fire on every player.updated broadcast.
  const colorMapRef = useRef(new Map<string, string>());
  const colorSig = players.map((p) => `${p.nickname}:${p.color}`).join("|");
  useEffect(() => {
    colorMapRef.current = new Map(players.map((p) => [p.nickname, p.color]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorSig]);

  const colorFor = (name: string): string => {
    return colorMapRef.current.get(name) ?? "#fbbf24";
  };

  useEffect(() => {
    const div = divRef.current;
    if (!div || mapRef.current) return;
    const map = L.map(div, {
      zoomControl: false,
      // Continuous (wrapping) map so street detail is never cut off at a hard
      // world edge: panning rolls over seamlessly and you can zoom out enough
      // to see ~2 world copies at once. No maxBounds / noWrap (those clipped the
      // edges); worldCopyJump keeps pins aligned with whichever copy is visible.
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 18,
    }).setView([20, 0], 3);
    mapRef.current = map;
    L.control.zoom().addTo(map);
    if (TILE_KEY) {
      L.tileLayer(`https://api.maptiler.com/maps/dark/{z}/{x}/{y}.png?key=${TILE_KEY}`, {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    } else {
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (enabled) onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [enabled]);

  // Keep tiles crisp when the window / viewport resizes (rotation, browser
  // chrome, virtual keyboard on mobile) — Leaflet must re-measure its container.
  useEffect(() => {
    const onResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((layer) => layer.remove());
    markersRef.current = [];
    if (!guess && !reveal) return;

    // During play (no reveal yet): show only the local player's guess pin
    // in their assigned color.
    if (guess && !reveal) {
      markersRef.current.push(
        L.marker([guess.lat, guess.lng], {
          icon: pinIcon(colorFor(nickname)),
        }).addTo(map),
      );
    }

    // At reveal: show every player's guess pin + the truth location + lines.
    // The whole map goes full screen (reveal-mode) so everyone's guess is
    // visible at once; the panel with the results lives in GameScreen.
    if (reveal) {
      const truthLatLng = L.latLng(reveal.location.lat, reveal.location.lng);
      const truth = L.marker(truthLatLng, { icon: truthIcon() }).addTo(map);
      markersRef.current.push(truth);

      const bounds = L.latLngBounds([truthLatLng]);

      // Draw each player's guess pin + connecting line in their color.
      for (const r of reveal.results) {
        if (r.lat == null || r.lng == null) continue;
        const guessLatLng = L.latLng(r.lat, r.lng);
        bounds.extend(guessLatLng);

        // Player's pin in their color, with a name tag so the full-screen
        // map reads at a glance.
        markersRef.current.push(
          L.marker(guessLatLng, { icon: pinIconLabeled(r.color, r.nickname) }).addTo(map),
        );

        // Line from guess to truth in the player's color (thick + solid so it
        // reads clearly over the dark tiles)
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

      // Full-screen map: stay zoomed out to the bounds so every player's
      // pin and line stays in view for the whole reveal. Tight padding
      // (0.20 vs 0.35) keeps the view ~15% closer in.
      map.flyToBounds(bounds.pad(0.2), { duration: 1.0, maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess, reveal, nickname, colorSig]);

  // The wrap snaps to full screen the moment a reveal lands (and back to the
  // small box when the next round starts); Leaflet must re-measure its
  // container or tiles render at the wrong resolution.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    const timer = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(timer);
  }, [reveal]);

  // The reveal zoomed the map in on the truth location; when the next round
  // starts, snap back to the small world view so everyone guesses blind again.
  // Guarded on `submitted` so the reset also re-applies if a state update
  // lands in an order that leaves the flag set (snapshot/phase races).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || submitted) return;
    map.setView([20, 0], 3);
  }, [round, submitted]);

  // After submit, keep the map expanded so the user can still see the area
  // they pinned. When the next round starts (guess + submitted reset), the
  // map collapses back to the small box. Touch devices stay expanded while
  // playing (no hover to enlarge with).
  useEffect(() => {
    setExpanded(submitted || hovering || coarseRef.current);
  }, [submitted, hovering]);

  // Leaflet needs invalidateSize() once the CSS size transition has settled,
  // or tiles render at the old (collapsed) resolution.
  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 330);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  return (
    <div
      className={`guess-dock${expanded ? " expanded" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={`guessmap-wrap${expanded ? " expanded" : ""}${reveal ? " reveal-mode" : ""}`}
      >
        <div ref={divRef} className="guessmap" />
      </div>
      {guess && !reveal && (
        <button
          className={`guess-btn${submitted ? " submitted" : ""}`}
          onClick={onSubmitGuess}
          disabled={!enabled || submitted}
        >
          {submitted ? "SUBMITTED ✓" : "SUBMIT GUESS"}
        </button>
      )}
    </div>
  );
}