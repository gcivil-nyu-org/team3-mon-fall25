import { useEffect, useRef, useState } from "react";

/**
 * WebSocket hook with:
 * - JWT via ?token=
 * - auto-reconnect (exponential-ish backoff)
 * - connected flag
 */
export default function useChatSocket({
  conversationId,
  onMessage,
  onRead,
  onOpen,
  onClose,
}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!conversationId) return;

    const WS_BASE =
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL || "")
        .replace(/^http/, "ws")
        .replace(/\/api\/v1$/, "/ws");

    const token = localStorage.getItem("access_token");
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const url = `${WS_BASE}/chat/${conversationId}/${qs}`;

    let closed = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
        onOpen && onOpen();
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === "message.new") onMessage && onMessage(data.message);
          if (data.type === "read.broadcast") onRead && onRead(data);
        } catch (e){
          console.log(e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        onClose && onClose();
        if (closed) return;
        // simple backoff
        const delay = Math.min(1000 * (retryRef.current + 1), 8000);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      try {
        wsRef.current?.close();
      } catch (e){
          console.log(e);
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const sendJson = (payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  return {
    connected,
    sendText: (text) =>
      sendJson({ type: "message.send", client_id: crypto.randomUUID(), text }),
    sendRead: (messageId) =>
      sendJson({ type: "read.update", message_id: messageId }),
  };
}
