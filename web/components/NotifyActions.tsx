"use client";

import { useState } from "react";

import { notifyEmailEndpoint, notifyWhatsAppEndpoint } from "@/lib/api";

type Props = {
  publicId: string;
};

function mailtoDeepLink(to: string[], cc: string[], subject: string, body: string): string {
  const params = new URLSearchParams();
  if (cc.length) {
    params.set("cc", cc.join(","));
  }
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${encodeURIComponent(to.join(","))}?${params.toString()}`;
}

export default function NotifyActions({ publicId }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmail = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(notifyEmailEndpoint(publicId), { method: "POST" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to generate email");
      }
      const data = await response.json();
      window.location.href = mailtoDeepLink(data.to || [], data.cc || [], data.subject || "", data.body || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate email");
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(notifyWhatsAppEndpoint(publicId), { method: "POST" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to generate WhatsApp message");
      }
      const data = await response.json();
      if (data.deep_link) {
        window.open(data.deep_link, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate WhatsApp message");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="actions">
        <button className="button" onClick={handleEmail} disabled={busy}>
          Notify by Email
        </button>
        <button className="button secondary" onClick={handleWhatsApp} disabled={busy}>
          Share on WhatsApp
        </button>
      </div>
      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}
    </div>
  );
}
