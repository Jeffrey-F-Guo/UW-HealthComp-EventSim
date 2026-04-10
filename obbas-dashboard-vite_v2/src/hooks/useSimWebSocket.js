// src/hooks/useSimWebSocket.js
//
// Connects to a Python WebSocket server and parses incoming simulation frames.
//
// Expected JSON message format from Python:
// {
//   "queue_size":    2847,       // number of packets currently in the queue
//   "avg_wait_ms":  342,         // average wait time in milliseconds
//   "dropped_full": 487,         // packets dropped because queue was full
//   "dropped_expiry": 1203,      // packets dropped due to expiration/timeout
//   "timestamp":    1700000000   // optional unix timestamp; falls back to Date.now()
// }
//
// Optional fields your Python server can also send:
// {
//   "obbas_active": true,        // syncs the mode toggle from server side
//   "offices": [ ... ]           // per-office stats array (see officeSchema below)
// }

import { useEffect, useRef, useCallback, useState } from 'react';

const DEFAULT_URL = 'ws://localhost:9000/ws';
const RECONNECT_DELAY_MS = 2000;
const MAX_HISTORY = 120; // keep 2 minutes of 1s ticks

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function parseFrame(raw) {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Python sends: { "type": "METRICS_UPDATE", "payload": { ... } }
    if (msg.type !== 'METRICS_UPDATE' || !msg.payload) return null;
    const p = msg.payload;

    return {
      queueSize:     Number(p.queue_len          ?? 0),
      avgWaitMs:     Number(p.avg_latency        ?? 0),
      droppedFull:   Number(p.total_dropped_full ?? 0),
      droppedExpiry: Number(p.total_dropped_time ?? 0),
      totalProcessed: Number(p.total_processed ?? 0),
      timestamp:     Date.now() / 1000,
    };
  } catch {
    return null;
  }
}

export function useSimWebSocket(url = DEFAULT_URL) {
  const wsRef        = useRef(null);
  const reconnectRef = useRef(null);
  const mountedRef   = useRef(true);

  const [connected,  setConnected]  = useState(false);
  const [lastFrame,  setLastFrame]  = useState(null);
  const [history,    setHistory]    = useState([]);    // array of parsed frames
  const [error,      setError]      = useState(null);

  // ── send a message back to the Python server ──────────────────────────────
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── connect / reconnect ───────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        const frame = parseFrame(evt.data);
        if (!frame) return;
        setLastFrame(frame);
        setHistory(prev => {
          const next = [...prev, frame];
          return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
        });
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError('WebSocket error');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // auto-reconnect
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    } catch (e) {
      setError(String(e));
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    // return () => {
    //   mountedRef.current = false;
    //   clearTimeout(reconnectRef.current);
    //   wsRef.current?.close();
    // };
  }, [connect]);

  return { connected, lastFrame, history, error, send };
}
