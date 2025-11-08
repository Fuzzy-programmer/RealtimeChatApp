import { FaSearch, FaEllipsisV } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";

export default function UserList({
  users = [],
  allUsers = [],
  onSelectUser,
  username = "",
  activeUser = null,
  typingUser = null,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const router = useRouter();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // 🔒 Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    router.replace("/");
  };

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore clicks on toggle button
      if (buttonRef.current?.contains(event.target)) return;
      // Close dropdown if clicked elsewhere
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔍 Search filter logic
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      setShowSuggestions(false);
      return;
    }

    const regex = new RegExp(searchTerm, "i");
    const matched = allUsers.filter((u) => regex.test(u.username));
    setFilteredUsers(matched);
    setShowSuggestions(matched.length > 0);
  }, [searchTerm, allUsers]);

  const handleSelectSearchUser = (user) => {
    setSearchTerm("");
    setShowSuggestions(false);
    onSelectUser(user);
  };

  return (
    <div className="w-1/4 bg-gray-100 border-r border-gray-300 flex flex-col overflow-x-hidden">
      {/* ---------- HEADER ---------- */}
      <div className="flex justify-between items-center border-b border-gray-300 px-4 py-3 bg-white shadow-sm">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold cursor-pointer">
            {username ? username[0].toUpperCase() : "?"}
          </div>
          {username && (
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {username}
            </span>
          )}
        </div>

        <h2 className="font-bold text-xl text-gray-700">Chats</h2>

        {/* Dropdown */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowDropdown((prev) => !prev)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <FaEllipsisV />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
              >
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---------- SEARCH ---------- */}
      <div className="relative w-full p-3 bg-gray-50 border-b border-gray-200">
        <FaSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          placeholder="Search users..."
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 p-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        {showSuggestions && (
          <ul className="absolute left-3 right-3 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-10">
            {filteredUsers.map((user) => (
              <li
                key={user._id || user.username}
                onClick={() => handleSelectSearchUser(user)}
                className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
              >
                {user.username}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- CHAT USERS ---------- */}
      <ul className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {users.length > 0 ? (
          users.map((user) => (
            <li
              key={user._id || user.username}
              onClick={() => onSelectUser(user)}
              className={`flex justify-between items-center px-4 py-3 border-b border-gray-200 cursor-pointer transition-colors ${
                activeUser?.username === user.username
                  ? "bg-blue-100"
                  : "hover:bg-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar + Status */}
                <div className="relative">
                  <div className="w-9 h-9 bg-gray-400 text-white rounded-full flex items-center justify-center font-bold">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      user.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                    title={user.online ? "Online" : "Offline"}
                  ></span>
                </div>

                {/* Username + Typing/Last message */}
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm">
                    {user.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {typingUser === user.username
                      ? "Typing..."
                      : user.lastMessage
                      ? user.lastMessage.length > 20
                        ? user.lastMessage.slice(0, 20) + "..."
                        : user.lastMessage
                      : ""}
                  </span>
                </div>
              </div>

              {/* 🔵 Unread badge */}
              {user.unseen > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="bg-blue-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[1.2rem] text-center"
                >
                  {user.unseen > 99 ? "99+" : user.unseen}
                </motion.span>
              )}
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">No chats yet</p>
        )}
      </ul>
    </div>
  );
}
