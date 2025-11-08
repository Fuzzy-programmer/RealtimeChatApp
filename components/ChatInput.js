import { useState, useEffect, useRef } from "react";

export default function ChatInput({ onSend, onTypingStart, onTypingStop }) {
  const [message, setMessage] = useState("");
  const typingTimeoutRef = useRef(null);

  // 🧠 Notify when user starts typing (for real-time typing indicator)
  const handleTyping = (e) => {
    setMessage(e.target.value);

    // Notify "typing:start" immediately
    if (onTypingStart) onTypingStart();

    // Clear previous timeout (debounce)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing event after 1.5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  // 📨 Send message
  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    // Stop typing state immediately
    if (onTypingStop) onTypingStop();

    onSend(trimmed);
    setMessage("");
  };

  // 🧹 Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex w-full items-center gap-2 p-2 bg-white">
      <input
        type="text"
        value={message}
        onChange={handleTyping}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message..."
        className="flex-1 border border-gray-300 rounded-xl p-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!message.trim()}
        className={`px-5 py-2 rounded-xl text-white font-medium transition ${
          message.trim()
            ? "bg-blue-500 hover:bg-blue-600"
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        Send
      </button>
    </div>
  );
}
