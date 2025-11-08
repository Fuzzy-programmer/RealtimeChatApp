import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(username) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Event callback refs
  const onUsersChangedRef = useRef(null);
  const onMessageNewRef = useRef(null);
  const onPresenceChangeRef = useRef(null);
  const onTypingStartRef = useRef(null);
  const onTypingStopRef = useRef(null);
  const onMessagesSeenRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    // 👇 Initialize socket if not already connected
    if (!socketRef.current) {
      socketRef.current = io({
        auth: { username },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      const socket = socketRef.current;

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        setIsConnected(true);
      });

      socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket disconnected:", reason);
        setIsConnected(false);
      });

      // 🔄 When any user registers/logs in → update user list
      socket.on("users:changed", () => {
        onUsersChangedRef.current?.();
      });

      // 💬 New message event
      socket.on("message:new", (payload) => {
        onMessageNewRef.current?.(payload);
      });

      // 👥 Presence tracking
      socket.on("presence:online", (p) => {
        onPresenceChangeRef.current?.({ ...p, status: "online" });
      });
      socket.on("presence:offline", (p) => {
        onPresenceChangeRef.current?.({ ...p, status: "offline" });
      });

      // ✍️ Typing indicator events
      socket.on("typing:start", (data) => {
        onTypingStartRef.current?.(data);
      });
      socket.on("typing:stop", (data) => {
        onTypingStopRef.current?.(data);
      });

      // 👀 Messages seen acknowledgment
      socket.on("messages:seen", (data) => {
        onMessagesSeenRef.current?.(data);
      });
    }

    // Ensure socket server initialized
    fetch("/api/socket").catch(() => {});

    // Cleanup when component unmounts or username changes
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username]);

  // ✅ Public event subscription APIs
  const onUsersChanged = (cb) => { onUsersChangedRef.current = cb; };
  const onMessageNew = (cb) => { onMessageNewRef.current = cb; };
  const onPresenceChange = (cb) => { onPresenceChangeRef.current = cb; };
  const onTypingStart = (cb) => { onTypingStartRef.current = cb; };
  const onTypingStop = (cb) => { onTypingStopRef.current = cb; };
  const onMessagesSeen = (cb) => { onMessagesSeenRef.current = cb; };

  // ✅ Return socket for manual emits (e.g., typing events, seen updates)
  return {
    socket: socketRef.current,
    isConnected,
    onUsersChanged,
    onMessageNew,
    onPresenceChange,
    onTypingStart,
    onTypingStop,
    onMessagesSeen,
  };
}
