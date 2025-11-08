import { Server } from "socket.io";
import User from "../models/Users.js";

let io;

// In-memory presence map (fast lookups)
const usernameToSocketId = new Map();
const socketIdToUsername = new Map();

export function initIO(httpServer) {
  if (io) return io; // singleton
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", async (socket) => {
    const username = socket.handshake?.auth?.username;

    if (!username) {
      console.warn("⚠️ Socket connected without username");
      socket.disconnect();
      return;
    }

    // --- USER CONNECTED ---
    usernameToSocketId.set(username, socket.id);
    socketIdToUsername.set(socket.id, username);

    console.log(`✅ ${username} connected (${socket.id})`);

    try {
      // Mark user as online in DB
      await User.findOneAndUpdate(
        { username },
        { online: true, socketId: socket.id },
        { new: true }
      );
    } catch (err) {
      console.error("Error updating user online status:", err);
    }

    // Broadcast to everyone (except this user)
    socket.broadcast.emit("presence:online", {
      username,
      socketId: socket.id,
    });

    // --- TYPING EVENTS ---
    socket.on("typing:start", ({ to }) => {
      const toSid = getSocketIdByUsername(to);
      if (toSid)
        io.to(toSid).emit("typing:started", { from: username });
    });

    socket.on("typing:stop", ({ to }) => {
      const toSid = getSocketIdByUsername(to);
      if (toSid)
        io.to(toSid).emit("typing:stopped", { from: username });
    });

    // --- MESSAGE FORWARDING (Optional Direct Route) ---
    socket.on("message:client", ({ sender, receiver, text }) => {
      const receiverSid = getSocketIdByUsername(receiver);
      if (receiverSid) {
        io.to(receiverSid).emit("message:new", {
          sender,
          receiver,
          text,
          createdAt: new Date(),
        });
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", async () => {
      const uname = socketIdToUsername.get(socket.id);
      if (!uname) return;

      usernameToSocketId.delete(uname);
      socketIdToUsername.delete(socket.id);

      console.log(`❌ ${uname} disconnected`);

      try {
        // Update DB lastSeen + online=false
        await User.findOneAndUpdate(
          { username: uname },
          { online: false, socketId: null, lastSeen: new Date() }
        );
      } catch (err) {
        console.error("Error updating user offline status:", err);
      }

      io.emit("presence:offline", { username: uname });
    });
  });

  return io;
}

// --- Utility Exports ---
export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function getSocketIdByUsername(username) {
  return usernameToSocketId.get(username) || null;
}

export function getPresenceSnapshot() {
  // Returns { username: socketId }
  const snapshot = {};
  for (const [u, sid] of usernameToSocketId.entries()) {
    snapshot[u] = sid;
  }
  return snapshot;
}
