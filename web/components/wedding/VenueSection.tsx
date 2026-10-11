"use client";

/**
 * Venue 3D — the KH Club Kodanchery lawn, to scale, with the night
 * function laid out on it (stage décor, fabric canopy, Edison bulbs,
 * light-arch walkway, ceremony seating and dining).
 *
 * The model is a self-contained WebGL page served from
 * /public/wedding/venue-3d.html and embedded here, so it keeps its own
 * controls and doesn't add a 3D library to the app bundle. It holds no
 * family data — only the venue and the décor layout.
 */
import { useState } from "react";

const SRC = "/wedding/venue-3d.html";

export default function VenueSection() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="wVenue">
      <div className="wVenueBar">
        <div className="wVenueText">
          <strong>KH Club Kodanchery — wedding lawn</strong>
          <span>
            Hover (or tap) anything for its description and size · drag to rotate · scroll or
            pinch to zoom
          </span>
        </div>
        <a className="wVenueOpen" href={SRC} target="_blank" rel="noopener noreferrer">
          Open full screen ↗
        </a>
      </div>

      <div className="wVenueFrame">
        {!loaded ? <div className="wVenueLoading">Loading the 3D venue…</div> : null}
        <iframe
          src={SRC}
          title="KH Club Kodanchery — 3D venue and night layout"
          onLoad={() => setLoaded(true)}
          allow="fullscreen"
        />
      </div>

      <style>{`
        .wVenue { display: grid; gap: 12px; }
        .wVenueBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .wVenueText { display: grid; gap: 3px; }
        .wVenueText strong { font-size: 14px; color: var(--ink-0); }
        .wVenueText span { font-size: 12px; color: var(--ink-1); }
        .wVenueOpen {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--accent);
          color: var(--accent);
          text-decoration: none;
          white-space: nowrap;
        }
        .wVenueOpen:hover { background: var(--accent); color: #fff; }
        .wVenueFrame {
          position: relative;
          height: calc(100vh - 230px);
          min-height: 460px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #0b1220;
          box-shadow: var(--shadow-sm);
        }
        .wVenueFrame iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }
        .wVenueLoading {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #9fb0c2;
          font-size: 13px;
        }
        @media (max-width: 840px) {
          .wVenueFrame { height: calc(100vh - 250px); min-height: 380px; border-radius: 10px; }
        }
      `}</style>
    </div>
  );
}
