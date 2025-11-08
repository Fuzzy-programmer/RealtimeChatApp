import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Core identity
    username: {
      type: String,
      required: true,
      unique: true,      // already creates an index internally
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // 🔥 Real-time presence fields
    socketId: {
      type: String,
      default: null,     // updated when user connects/disconnects
    },
    online: {
      type: Boolean,
      default: false,    // synced with socket events
    },
    lastSeen: {
      type: Date,
      default: null,     // updated when user disconnects
    },

    // Optional metadata
    avatar: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ Pre-save normalization
userSchema.pre("save", function (next) {
  if (this.username) this.username = this.username.trim();
  next();
});

export default mongoose.models.User || mongoose.model("User", userSchema);
