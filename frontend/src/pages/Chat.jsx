import { useEffect, useRef, useState } from "react";
import {
  listConversations,
  getMessages,
  sendMessage as sendMessageAPI,
  markRead,
} from "../api/chat";
import { getSelfIdFromJWT, fetchMeId } from "../api/auth";
import useChatSocket from "../hooks/useChatSocket";
import "./Chat.css";

function ChatListItem({ conv, active, onClick }) {
  const lastText = conv?.last_message?.text || "Start the conversation…";
  const time = conv?.last_message?.created_at
    ? new Date(conv.last_message.created_at).toLocaleString()
    : "";
  return (
    <div className={`chat-list-item ${active ? "active" : ""}`} onClick={onClick}>
      <div className="chat-list-row">
        <div className="chat-list-title">Chat</div>
        {conv.unread_count > 0 && <span className="badge">{conv.unread_count}</span>}
      </div>
      <div className="chat-list-sub">{lastText}</div>
      <div className="chat-list-time">{time}</div>
    </div>
  );
}

function MessageBubble({ m, selfId }) {
  const mine = String(m.sender) === String(selfId);
  return (
    <div className={`msg-row ${mine ? "mine" : "theirs"}`}>
      <div className={`msg ${mine ? "mine" : "theirs"}`}>
        <div className="msg-text">{m.text}</div>
        <div className="msg-time">{new Date(m.created_at).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [selfId, setSelfId] = useState("");
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]); // newest first from API
  const [input, setInput] = useState("");
  const [nextBefore, setNextBefore] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const pollTimer = useRef(null);

  // Resolve current user id (JWT → /auth/me fallback)
  useEffect(() => {
    const jwtId = getSelfIdFromJWT();
    if (jwtId) {
      setSelfId(String(jwtId));
    } else {
      fetchMeId().then((id) => id && setSelfId(String(id)));
    }
  }, []);

  // Initial conversations
  useEffect(() => {
    (async () => {
      try {
        const data = await listConversations();
        setConvs(data);
        if (data.length && !activeId) setActiveId(data[0].id);
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when switching conversation
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const { results, next_before } = await getMessages(activeId, { limit: 50 });
        setMessages(results);
        setNextBefore(next_before || null);

        // mark newest as read
        if (results.length) await markRead(activeId, results[0].id);

        // clear unread in list
        setConvs((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c))
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [activeId]);

  // WebSocket live updates + fallback polling
  const { connected, sendText, sendRead } = useChatSocket({
    conversationId: activeId,
    onMessage: (msg) => {
      setMessages((prev) => {
        if (prev.length && prev[0].id === msg.id) return prev; // avoid dup
        return [msg, ...prev];
      });
      if (String(msg.sender) !== String(selfId)) {
        sendRead(msg.id);
        markRead(activeId, msg.id).catch(() => {});
      }
      setConvs((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, last_message: msg, last_message_at: msg.created_at }
            : c
        )
      );
    },
  });

  // Poll every 5s if WS is down (keeps it fresh without manual refresh)
  useEffect(() => {
    if (!activeId) return;
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (!connected) {
      pollTimer.current = setInterval(async () => {
        try {
          const { results } = await getMessages(activeId, { limit: 1 });
          if (results.length && (!messages.length || results[0].id !== messages[0].id)) {
            const { results: latest } = await getMessages(activeId, { limit: 50 });
            setMessages(latest);
          }
        } catch (e){
          console.log(e);
        }
      }, 5000);
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activeId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !activeId) return;
    setInput("");

    try {
      // optimistic via WS + confirm via REST
      sendText(text);
      const m = await sendMessageAPI(activeId, text);
      setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [m, ...prev]));
    } catch (e) {
      console.error(e);
      setInput(text);
    }
  };

  const loadMore = async () => {
    if (!activeId || !nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { results, next_before } = await getMessages(activeId, {
        before: nextBefore,
        limit: 50,
      });
      setMessages((prev) => [...prev, ...results]);
      setNextBefore(next_before || null);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">Conversations</div>
        <div className="chat-list">
          {convs.map((c) => (
            <ChatListItem
              key={c.id}
              conv={c}
              active={c.id === activeId}
              onClick={() => setActiveId(c.id)}
            />
          ))}
          {!convs.length && <div className="empty">No conversations yet.</div>}
        </div>
      </aside>

      <main className="chat-main">
        {activeId ? (
          <>
            <div className="chat-header">
              Chat • {activeId.slice(0, 8)}… {!connected && <span className="ws-off">(live off)</span>}
            </div>

            <div className="chat-history">
              <button
                disabled={!nextBefore || loadingMore}
                onClick={loadMore}
                className="load-more"
              >
                {loadingMore ? "Loading…" : nextBefore ? "Load older" : "No more"}
              </button>

              {/* messages are newest-first; render reversed so newest is at bottom */}
              {[...messages].reverse().map((m) => (
                <MessageBubble key={m.id} m={m} selfId={selfId} />
              ))}
            </div>

            <div className="chat-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === "Enter" && onSend()}
              />
              <button onClick={onSend}>Send</button>
            </div>
          </>
        ) : (
          <div className="chat-empty">Select a conversation</div>
        )}
      </main>
    </div>
  );
}
