"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaBoot() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const enablePwa = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (!enablePwa || process.env.NODE_ENV !== "production") {
        // In local/dev or when PWA is disabled, aggressively clear service workers and caches.
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            registrations.forEach((registration) => {
              registration.unregister();
            });
          })
          .catch(() => {
            // best-effort cleanup only
          });
        if ("caches" in window) {
          caches
            .keys()
            .then((keys) => {
              keys.forEach((key) => {
                caches.delete(key);
              });
            })
            .catch(() => {
              // best-effort cleanup only
            });
        }
      } else {
        navigator.serviceWorker.register("/service-worker.js").catch(() => {
          // Non-blocking; app should still work without service worker.
        });
      }
    }

    const onBeforeInstallPrompt = (event: Event) => {
      if (!enablePwa || process.env.NODE_ENV !== "production") {
        return;
      }
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!enablePwa || !installEvent || hidden) {
    return null;
  }

  const install = async () => {
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      setHidden(true);
      setInstallEvent(null);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 2000 }}>
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          borderRadius: 12,
          background: "#102120",
          color: "#fff",
          padding: "12px 14px",
          boxShadow: "0 10px 25px #00000040",
          display: "grid",
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 14 }}>Install Civic Pulse</strong>
        <span style={{ fontSize: 13, opacity: 0.9 }}>Add this app to your home screen for faster reporting.</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button" onClick={install}>
            Install
          </button>
          <button className="button secondary" onClick={() => setHidden(true)}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
