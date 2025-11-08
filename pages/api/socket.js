// pages/api/socket.js
import { initIO } from "../../lib/socket";

// Disable Next.js body parsing — Socket.IO manages its own HTTP upgrade
export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  // Only initialize once
  if (!res.socket.server.io) {
    console.log("🚀 Initializing Socket.IO server...");
    const io = initIO(res.socket.server);
    res.socket.server.io = io;
    console.log("✅ Socket.IO server ready!");
  } else {
    console.log("⚡ Socket.IO server already running.");
  }

  res.end();
}
