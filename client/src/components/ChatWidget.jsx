import React, { useEffect, useState } from "react";
import { socket } from "../socket";

export default function ChatWidget({ meName, meRole, participants, onKick }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat"); // "chat" | "participants"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg].slice(-100));
    };
    socket.on("chatMessage", handler);
    return () => socket.off("chatMessage", handler);
  }, []);

  const send = (e) => {
    e && e.preventDefault();
    const text = input.trim();
    if (!text) return;
    socket.emit("sendChatMessage", {
      from: meName,
      role: meRole,
      text,
      ts: Date.now(),
    });
    setInput("");
  };

  return (
    <>
      {/* toggle button bottom-right */}
      <div className="lp-chat-toggle">
        <button
          type="button"
          className="lp-primary-btn"
          style={{ borderRadius: "50%", width: 46, height: 46, padding: 0 }}
          onClick={() => setOpen((v) => !v)}
        >
          💬
        </button>
      </div>

      {open && (
        <div className="lp-chat-panel">
          <div className="lp-chat-header">
            <span>Chat & Participants</span>
            <button
              type="button"
              style={{
                border: "none",
                background: "transparent",
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="lp-chat-tabs">
            <div
              className={
                "lp-chat-tab" + (tab === "chat" ? " lp-chat-tab--active" : "")
              }
              onClick={() => setTab("chat")}
            >
              Chat
            </div>
            <div
              className={
                "lp-chat-tab" +
                (tab === "participants" ? " lp-chat-tab--active" : "")
              }
              onClick={() => setTab("participants")}
            >
              Participants
            </div>
          </div>

          <div className="lp-chat-body">
            {tab === "chat" ? (
              messages.length === 0 ? (
                <div className="lp-muted">No messages yet. Say hi 👋</div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className="lp-chat-message">
                    <strong>{m.from}</strong>{" "}
                    <span style={{ color: "#9a9a9a", fontSize: 10 }}>
                      ({m.role})
                    </span>
                    <br />
                    {m.text}
                  </div>
                ))
              )
            ) : participants.length === 0 ? (
              <div className="lp-muted">No participants connected.</div>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span>{p.name}</span>
                  {meRole === "teacher" && (
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#d12b2b",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                      onClick={() => onKick && onKick(p.id)}
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {tab === "chat" && (
            <form className="lp-chat-footer" onSubmit={send}>
              <input
                className="lp-chat-input"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="lp-primary-btn"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
