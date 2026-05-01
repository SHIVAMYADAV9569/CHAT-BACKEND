import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    postedAt: { type: Date, default: null },
    viewers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
      },
    ],
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
        avatarUrl: String,
      },
    ],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    email: { type: String, require: true, unique: true, lowercase: true },
    password: { type: String, require: true },
    confirmpassword: { type: String, require: true },
    avatarUrl: { type: String, default: "" },
    status: { type: statusSchema, default: {} },
    lastSeen: { type: Date, default: null },
  },
  {
    timestamps: true, //createdAt, updatedAt
  }
);

const User = mongoose.model("User", userSchema);

export default User;