"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getPublicApiBase } from "@/lib/api";

type SSEEvent = {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
};

export function useReportStream(publicId: string | null) {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [checkinCount, setCheckinCount] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!publicId || !mountedRef.current) return;

    cleanup();

    const url = `${getPublicApiBase()}/v1/reports/${publicId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      backoffRef.current = 1000; // reset backoff on successful connection
    };

    es.addEventListener("status_change", (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(e.data);
        const sseEvent: SSEEvent = {
          event: "status_change",
          data: parsed,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(sseEvent);
      } catch {
        console.warn("[sse] Failed to parse status_change event data");
      }
    });

    es.addEventListener("checkin", (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(e.data);
        const sseEvent: SSEEvent = {
          event: "checkin",
          data: parsed,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(sseEvent);
        setCheckinCount((prev) => prev + 1);
      } catch {
        console.warn("[sse] Failed to parse checkin event data");
      }
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      es.close();
      esRef.current = null;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(backoffRef.current, 30000);
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);

      retryRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    };
  }, [publicId, cleanup]);

  useEffect(() => {
    mountedRef.current = true;

    if (publicId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
      setIsConnected(false);
    };
  }, [publicId, connect, cleanup]);

  return { lastEvent, isConnected, checkinCount };
}
