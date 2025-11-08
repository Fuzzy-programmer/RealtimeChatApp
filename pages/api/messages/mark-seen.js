// pages/api/messages/mark-seen.js
import db from "../../../lib/db";
import Message from "../../../models/Message";
import User from "../../../models/Users";
import { getIO, getSocketIdByUsername } from "../../../lib/socket";

export default async function handler(req, res) {
  await db(); // ensure DB connection

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
      return res.status(400).json({ message: "Both usernames are required" });
    }

    // Find the user documents
    const [viewer, partner] = await Promise.all([
      User.findOne({ username: user1 }),
      User.findOne({ username: user2 }),
    ]);

    if (!viewer || !partner) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Mark messages from user2 → user1 as seen
    const result = await Message.updateMany(
      { sender: partner._id, receiver: viewer._id, seen: false },
      { $set: { seen: true } }
    );

    // 🚀 Notify sender (partner) if they’re online — their unread badge should refresh
    try {
      const io = getIO();
      const partnerSid = getSocketIdByUsername(partner.username);
      if (partnerSid) {
        io.to(partnerSid).emit("messages:seen", {
          from: viewer.username,
          by: user1,
        });
      }
    } catch (err) {
      console.warn("⚠️ Socket.IO emit skipped:", err.message);
    }

    return res.status(200).json({
      message: "Messages marked as seen",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("❌ POST /api/messages/mark-seen error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
