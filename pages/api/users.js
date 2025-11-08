import db from "../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/Users";
import { getIO, getPresenceSnapshot } from "../../lib/socket";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

export default async function handler(req, res) {
  await db(); // ensure DB connection
  const { method } = req;

  switch (method) {
    /**
     * 🧩 REGISTER (POST /api/users)
     */
    case "POST":
      try {
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).json({ message: "Username and password are required" });
        }

        // Check if username already exists
        const existing = await User.findOne({ username });
        if (existing) {
          return res.status(400).json({ message: "Username already exists" });
        }

        // Hash password & save
        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashed });
        await newUser.save();

        // Broadcast users:changed event
        try {
          const io = getIO();
          io.emit("users:changed");
        } catch (err) {
          console.warn("Socket.IO not initialized yet, skipping users:changed emit");
        }

        return res.status(201).json({ message: "User registered successfully" });
      } catch (err) {
        console.error("POST /api/users error:", err);
        return res.status(500).json({ message: "Server error" });
      }

    /**
     * 🧩 LOGIN (PUT /api/users)
     */
    case "PUT":
      try {
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: "1d" });

        return res.status(200).json({
          message: "Login successful",
          token,
          username,
        });
      } catch (err) {
        console.error("PUT /api/users error:", err);
        return res.status(500).json({ message: "Server error" });
      }

    /**
     * 🧩 RESET PASSWORD (PATCH /api/users)
     */
    case "PATCH":
      try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) {
          return res.status(400).json({ message: "Username and new password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
      } catch (err) {
        console.error("PATCH /api/users error:", err);
        return res.status(500).json({ message: "Server error" });
      }

    /**
     * 🧩 FETCH ALL USERS (GET /api/users or /api/users?q=search)
     */
    case "GET":
      try {
        const { q } = req.query;
        const filter = q
          ? { username: { $regex: q, $options: "i" } }
          : {};

        // Fetch users without password
        const users = await User.find(filter).select("-password").lean();

        // Merge online/offline presence info from socket map
        const presence = getPresenceSnapshot();
        const merged = users.map((u) => ({
          ...u,
          online: !!presence[u.username],
          socketId: presence[u.username] || null,
        }));

        return res.status(200).json(merged);
      } catch (err) {
        console.error("GET /api/users error:", err);
        return res.status(500).json({ message: "Server error" });
      }

    /**
     * 🧩 DEFAULT — Unsupported method
     */
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
