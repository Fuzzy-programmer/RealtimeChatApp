import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Who sent the message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Who received it
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The text content
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000, // avoid spam/huge payloads
    },

    // 🔥 Seen/unseen tracking (for unread badge)
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Optional: if you want to add attachments or message type in future
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
  },
  { timestamps: true }
);

// 🧠 Indexes for fast retrieval of chat history & recent users
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, seen: 1 }); // helps unread count queries

// ✅ Optional helper method (if you want easy JSON formatting)
messageSchema.methods.toChatJSON = function () {
  return {
    id: this._id,
    sender: this.sender,
    receiver: this.receiver,
    text: this.text,
    seen: this.seen,
    createdAt: this.createdAt,
  };
};

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
