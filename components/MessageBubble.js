import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

export default function MessageBubble({
  text,
  from,
  seen = false,
  createdAt,
}) {
  const isMe = from === "me";

  // Format time (e.g., "10:42 AM")
  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col ${
        isMe ? "items-end" : "items-start"
      } w-full`}
    >
      <div
        className={`relative px-4 py-2 rounded-2xl max-w-[75%] wrap-break-word shadow-sm ${
          isMe
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-200 text-gray-800 rounded-bl-none"
        }`}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{text}</p>

        {/* Time + Seen status */}
        <div
          className={`text-xs mt-1 flex items-center gap-1 ${
            isMe ? "text-blue-100 justify-end" : "text-gray-500 justify-start"
          }`}
        >
          <span>{formattedTime}</span>
          {isMe && (
            <>
              {seen ? (
                <CheckCheck size={14} className="text-blue-200" />
              ) : (
                <Check size={14} className="text-blue-200 opacity-80" />
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
