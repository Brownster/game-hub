import React, { useEffect, useRef, useState } from "react";

export default function ChatPanel({ open, messages, onSend, session, socketRef, typingUsers }) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const emitTyping = () => {
    const socket = socketRef?.current;
    if (!socket) return;

    const now = Date.now();
    // Debounce: only emit every 2.5 seconds
    if (now - lastTypingEmitRef.current >= 2500) {
      socket.emit("room:typing");
      lastTypingEmitRef.current = now;
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  if (!open) return null;

  // Build typing indicator text
  const typingNames = Array.from(typingUsers?.values() || []);
  let typingText = "";
  if (typingNames.length === 1) {
    typingText = `${typingNames[0]} is typing...`;
  } else if (typingNames.length === 2) {
    typingText = `${typingNames[0]} and ${typingNames[1]} are typing...`;
  } else if (typingNames.length > 2) {
    typingText = `${typingNames.length} people are typing...`;
  }

  return (
    <aside className="chat-panel">
      <div className="chat-header">Chat</div>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.playerId === session.playerId ? "own" : ""}`}
          >
            <span className="chat-author">{msg.displayName}:</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
      </div>
      {typingText && <div className="chat-typing">{typingText}</div>}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button type="submit" className="chat-send-btn">Send</button>
      </form>
    </aside>
  );
}
