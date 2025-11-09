// pages/api/message.js
import db from "../../lib/db";
import Message from "../../models/Message";
import User from "../../models/Users";
import { getIO, getSocketIdByUsername, getPresenceSnapshot } from "../../lib/socket";

export default async function handler(req, res) {
  await db(); // ensure MongoDB connection
  const { method } = req;

  switch (method) {
    // ✅ SEND MESSAGE
    case "POST": {
      try {
        const { senderUsername, receiverUsername, text } = req.body;
        if (!senderUsername || !receiverUsername || !text?.trim()) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const [sender, receiver] = await Promise.all([
          User.findOne({ username: senderUsername }),
          User.findOne({ username: receiverUsername }),
        ]);

        if (!sender || !receiver) {
          return res.status(404).json({ message: "User not found" });
        }

        // ✅ Create and save new message
        const newMessage = await Message.create({
          sender: sender._id,
          receiver: receiver._id,
          text: text.trim(),
          seen: false,
        });

        // ✅ Populate with usernames
        const populated = await Message.findById(newMessage._id)
          .populate("sender", "username")
          .populate("receiver", "username")
          .lean();

        // ✅ Real-time send to receiver
        try {
          const io = getIO();
          const receiverSid = getSocketIdByUsername(receiverUsername);

          const payload = {
            id: populated._id.toString(),
            sender: populated.sender.username,
            receiver: populated.receiver.username,
            text: populated.text,
            createdAt: populated.createdAt,
            seen: populated.seen,
          };

          if (receiverSid) {
            io.to(receiverSid).emit("message:new", payload);
          }
        } catch (err) {
          console.warn("⚠️ Socket.IO emit skipped:", err.message);
        }

        return res.status(201).json({
          message: "Message sent successfully",
          data: populated,
        });
      } catch (error) {
        console.error("Error saving message:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }

    // ✅ FETCH CHAT HISTORY OR RECENT CHATS
    case "GET": {
      try {
        const { user1, user2, recent } = req.query;

        // --- 🕒 RECENT CHATS ---
        if (recent && user1) {
          const user = await User.findOne({ username: user1 });
          if (!user) return res.status(404).json({ message: "User not found" });

          const recentMessages = await Message.find({
            $or: [{ sender: user._id }, { receiver: user._id }],
          })
            .populate("sender", "username")
            .populate("receiver", "username")
            .sort({ updatedAt: -1 })
            .lean();

          // Deduplicate chat partners
          const partners = new Map();
          for (const msg of recentMessages) {
            const partner =
              msg.sender.username === user1 ? msg.receiver : msg.sender;
            if (!partners.has(partner.username)) {
              partners.set(partner.username, partner);
            }
          }

          // Count unseen messages per partner
          const unseenCounts = await Message.aggregate([
            { $match: { receiver: user._id, seen: false } },
            { $group: { _id: "$sender", count: { $sum: 1 } } },
          ]);

          const countMap = new Map(
            unseenCounts.map((c) => [String(c._id), c.count])
          );

          const presence = getPresenceSnapshot();

          const partnerList = await Promise.all(
            Array.from(partners.entries()).map(async ([uname, partner]) => {
              const partnerUser = await User.findOne({ username: uname }).lean();
              return {
                username: uname,
                unseen: countMap.get(String(partnerUser?._id)) || 0,
                online: !!presence[uname],
                socketId: presence[uname] || null,
              };
            })
          );
          return res.status(200).json(partnerList);
        }

        // --- 💬 DIRECT CHAT ---
        if (!user1 || !user2) {
          return res.status(400).json({ message: "Missing user parameters" });
        }

        const [userA, userB] = await Promise.all([
          User.findOne({ username: user1 }),
          User.findOne({ username: user2 }),
        ]);

        if (!userA || !userB) {
          return res.status(404).json({ message: "User not found" });
        }

        const messages = await Message.find({
          $or: [
            { sender: userA._id, receiver: userB._id },
            { sender: userB._id, receiver: userA._id },
          ],
        })
          .populate("sender", "username")
          .populate("receiver", "username")
          .sort({ createdAt: 1 })
          .lean();

        // ✅ Mark unseen messages as seen (userB → userA)
        const unseenUpdate = await Message.updateMany(
          { sender: userB._id, receiver: userA._id, seen: false },
          { $set: { seen: true } }
        );

        // 👀 Emit seen event to sender if online
        if (unseenUpdate.modifiedCount > 0) {
          try {
            const io = getIO();
            const senderSid = getSocketIdByUsername(user2);
            if (senderSid) {
              io.to(senderSid).emit("messages:seen", {
                from: user1,
                by: user1,
              });
            }
          } catch (err) {
            console.warn("⚠️ Socket.IO emit skipped:", err.message);
          }
        }

        return res.status(200).json(messages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({ message: "Server error" });
      }
    }

    default:
      res.setHeader("Allow", ["POST", "GET"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
