import { useEffect, useRef, useState } from "react";

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

  // 1. Keep the latest callbacks in refs to avoid stale closures
  // and unnecessary reconnects when the handler function identity changes.
  const onMessageRef = useRef(onMessage);
  const onReadRef = useRef(onRead);
  
  // Update refs whenever the passed functions change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onReadRef.current = onRead;
  }, [onMessage, onRead]);

  useEffect(() => {
    if (!conversationId) return;

    // Build URL
    const WS_BASE =
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL || "")
        .replace(/^http/, "ws")
        .replace(/\/api\/v1\/?$/, ""); // strip api suffix if present to get root

    const token = localStorage.getItem("access_token");
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    // Ensure we don't double slash if WS_BASE ends with /
    const cleanBase = WS_BASE.replace(/\/$/, ""); 
    const url = `${cleanBase}/ws/chat/${conversationId}/${qs}`;

    let closed = false;

    const connect = () => {
      console.log("Connecting to WS:", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS Connected");
        retryRef.current = 0;
        setConnected(true);
        if (onOpen) onOpen();
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          // Call the LATEST version of the callback
          if (data.type === "message.new" && onMessageRef.current) {
            onMessageRef.current(data.message);
          }
          if (data.type === "read.broadcast" && onReadRef.current) {
            onReadRef.current(data);
          }
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onclose = (e) => {
        console.log("WS Closed", e.code, e.reason);
        setConnected(false);
        if (onClose) onClose();
        
        if (closed) return;
        
        // Don't retry if the backend rejected auth (4001/4003)
        if (e.code === 4001 || e.code === 4003) {
            console.error("WS Auth Failed - Check Django Middleware");
            return;
        }

        const delay = Math.min(1000 * (retryRef.current + 1), 8000);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversationId]); // Only reconnect if conversationId changes

  const sendJson = (payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
        console.warn("WS not open, cannot send", payload);
    }
  };

  return {
    connected,
    sendText: (text) =>
      sendJson({ type: "message.send", client_id: crypto.randomUUID(), text }),
    sendRead: (messageId) =>
      sendJson({ type: "read.update", message_id: messageId }),
  };
}