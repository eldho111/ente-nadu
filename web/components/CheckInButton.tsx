"use client";
import { useState, useCallback } from "react";
import { getPublicApiBase } from "@/lib/api";
import { getDeviceId } from "@/lib/device";

type CheckInButtonProps = {
  publicId: string;
  initialCount?: number;
};

type CheckInState = "idle" | "locating" | "submitting" | "success" | "error";

export default function CheckInButton({ publicId, initialCount = 0 }: CheckInButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [state, setState] = useState<CheckInState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isBusy = state === "locating" || state === "submitting";

  const handleCheckIn = useCallback(async () => {
    if (isBusy) return;

    setState("locating");
    setErrorMsg("");

    let lat: number | null = null;
    let lon: number | null = null;

    // Attempt to get geolocation (non-blocking — proceed even if denied)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        });
      });
      lat = position.coords.latitude;
      lon = position.coords.longitude;
    } catch {
      // Geolocation denied or unavailable — continue without it
    }

    setState("submitting");

    try {
      const deviceId = getDeviceId();
      const url = `${getPublicApiBase()}/v1/reports/${publicId}/checkin`;

      const body: Record<string, unknown> = { device_id: deviceId };
      if (lat !== null && lon !== null) {
        body.lat = lat;
        body.lon = lon;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setCount((prev) => prev + 1);
        setState("success");
        setTimeout(() => setState("idle"), 2500);
      } else if (response.status === 429) {
        setState("error");
        setErrorMsg("Already checked in today");
        setTimeout(() => setState("idle"), 3000);
      } else {
        const data = await response.json().catch(() => null);
        const message = (data && typeof data.detail === "string") ? data.detail : "Check-in failed";
        setState("error");
        setErrorMsg(message);
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setState("error");
      setErrorMsg("Network error — please try again");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [publicId, isBusy]);

  const buttonLabel = (() => {
    switch (state) {
      case "locating":
        return "Getting location…";
      case "submitting":
        return "Submitting…";
      case "success":
        return "Check-in recorded!";
      case "error":
        return errorMsg;
      default:
        return "Still an issue";
    }
  })();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <button
        className="button"
        onClick={handleCheckIn}
        disabled={isBusy}
        aria-busy={isBusy}
        style={{
          opacity: isBusy ? 0.7 : 1,
          cursor: isBusy ? "not-allowed" : "pointer",
        }}
      >
        {state === "idle" && <span aria-hidden="true">&#x2705; </span>}
        {buttonLabel}
      </button>
      <span className="chip muted">{count}</span>
    </div>
  );
}
