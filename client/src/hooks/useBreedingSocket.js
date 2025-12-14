import { useEffect, useRef, useState, useCallback } from "react";

const makeWsUrl = (base) => {
  if (!base) base = "http://localhost:8000";
  try {
    const u = new URL(base);
    const protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${u.host}/ws/breeding`;
  } catch (e) {
    return "ws://localhost:8000/ws/breeding";
  }
};

export default function useBreedingSocket({
  enabled = false,
  base = import.meta.env.VITE_API_BASE,
} = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const send = useCallback((obj) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    const url = makeWsUrl(base);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.warn("WS error", e);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setMessages((m) => [...m.slice(-199), data]);
      } catch (e) {
        setMessages((m) => [...m.slice(-199), ev.data]);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, [enabled, base]);

  return { connected, messages, send };
}
