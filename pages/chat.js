import { useState, useEffect, useRef } from "react";
import { FaEllipsisV } from "react-icons/fa";
import UserList from "../components/UserList";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

  const {
    socket,
    isConnected,
    onMessageNew,
    onUsersChanged,
    onPresenceChange,
    onTypingStart,
    onTypingStop,
  } = useSocket(username);

  // 🧠 load logged-in user
  useEffect(() => {
    const stored = sessionStorage.getItem("username");
    if (stored) setUsername(stored);
    else {
      toast.error("Please Login");
      router.replace("/");
    }
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const movePartnerToTop = (partnerUsername) => {
    setRecentUsers((prev) => {
      const uname = partnerUsername?.username || partnerUsername;
      if (!uname) return prev;
      const existing =
        prev.find((u) => u.username === uname) || { username: uname };
      const filtered = prev.filter((u) => u.username !== uname);
      return [existing, ...filtered];
    });
  };

  // 🧩 Fetch all users (DB)
  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data || []);
      }
    } catch (err) {
      console.error("fetchAllUsers error:", err);
    }
  };

  // 🧩 Fetch recent chat users
  const fetchRecentUsers = async () => {
    if (!username) return;
    try {
      const res = await fetch(
        `/api/message?user1=${encodeURIComponent(username)}&recent=true`
      );
      if (res.ok) setRecentUsers((await res.json()) || []);
    } catch (err) {
      console.error("fetchRecentUsers error:", err);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (username) fetchRecentUsers();
  }, [username]);

  // 🟢 Handle socket events
  useEffect(() => {
    if (!socket || !username) return;

    // 🔄 Refresh all users when any change happens
    onUsersChanged(fetchAllUsers);

    // 👥 Live presence updates
    onPresenceChange(({ username: u, socketId, status }) => {
      setAllUsers((prev) => {
        const next = prev.map((x) =>
          x.username === u
            ? {
                ...x,
                online: status === "online",
                socketId: status === "online" ? socketId : null,
              }
            : x
        );
        if (!next.find((x) => x.username === u)) {
          next.unshift({
            username: u,
            online: status === "online",
            socketId: status === "online" ? socketId : null,
          });
        }
        return next;
      });
    });

    // 💬 New message
    onMessageNew((msg) => {
      if (msg.sender !== username && msg.receiver !== username) return;
      const partner = msg.sender === username ? msg.receiver : msg.sender;
      movePartnerToTop(partner);

      if (selectedUser && partner === selectedUser.username) {
        setMessages((prev) => [
          ...prev,
          {
            sender: { username: msg.sender },
            receiver: { username: msg.receiver },
            text: msg.text,
            createdAt: msg.createdAt,
            seen: msg.seen,
          },
        ]);
        setTimeout(() => scrollToBottom(true), 30);
      }
    });

    // ✍️ Typing events
    onTypingStart(({ from }) => {
      if (from !== username) setTypingUser(from);
    });

    onTypingStop(({ from }) => {
      if (from !== username) setTypingUser(null);
    });
  }, [socket, username, selectedUser]);

  // 🗨️ Fetch chat history
  const fetchChatHistory = async (partner) => {
    if (!username || !partner) return;
    setLoadingMessages(true);
    setMessages([]);
    try {
      const url = `/api/message?user1=${encodeURIComponent(
        username
      )}&user2=${encodeURIComponent(partner.username)}`;
      const res = await fetch(url);
      const data = res.ok ? await res.json() : [];
      setMessages(data || []);
      setTimeout(() => scrollToBottom(false), 40);
    } catch (err) {
      console.error("fetchChatHistory error:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setTypingUser(null);
    await fetchChatHistory(user);
  };

  // 📨 Send message
  const handleSend = async (text) => {
    if (!selectedUser || !text?.trim()) return;
    const trimmed = text.trim();

    // optimistic bubble
    setMessages((prev) => [
      ...prev,
      {
        sender: { username },
        receiver: { username: selectedUser.username },
        text: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    movePartnerToTop(selectedUser.username);
    scrollToBottom(true);

    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: username,
          receiverUsername: selectedUser.username,
          text: trimmed,
        }),
      });
      if (!res.ok)
        console.error("POST /api/message failed", res.status);
    } catch (err) {
      console.error("handleSend error:", err);
    }
  };

  // 👀 Scroll down when new messages come in
  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(true), 40);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT PANEL */}
      <UserList
        users={recentUsers}
        allUsers={allUsers}
        username={username}
        activeUser={selectedUser}
        typingUser={typingUser}
        onSelectUser={handleSelectUser}
      />

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-gray-100 h-full overflow-hidden">
        {selectedUser ? (
          <>
            {/* HEADER */}
            <div className="flex-none flex justify-between items-center px-4 py-4 border-b border-gray-300 bg-gray-300">
              <h2 className="font-bold text-xl text-gray-700 flex items-center gap-2">
                {selectedUser.username}
                {selectedUser.online && (
                  <span className="text-green-500 text-sm">●</span>
                )}
              </h2>

              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowDropdown((s) => !s)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <FaEllipsisV />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-20">
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setMessages([]);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                    >
                      Close Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2"
              >
                {loadingMessages ? (
                  <div className="text-center text-gray-500 mt-10">
                    Loading chat...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      text={msg.text}
                      from={
                        msg.sender?.username === username
                          ? "me"
                          : msg.sender?.username
                      }
                      createdAt={msg.createdAt}
                      seen={msg.seen}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-10">
                    No messages yet. Start chatting!
                  </div>
                )}
                {typingUser === selectedUser?.username && (
                  <div className="text-gray-400 text-sm italic ml-2">
                    {selectedUser.username} is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div className="flex-none px-4 py-2 border-t bg-white border-gray-300">
                <ChatInput
                  onSend={handleSend}
                  onTypingStart={() =>
                    socket?.emit("typing:start", {
                      to: selectedUser.username,
                      from: username,
                    })
                  }
                  onTypingStop={() =>
                    socket?.emit("typing:stop", {
                      to: selectedUser.username,
                      from: username,
                    })
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
