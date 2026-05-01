import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { getReceiverSocketId, io } from "../SocketIO/server.js";

export const sendMessage = async (req, res) => {
  try {
    console.log("hii", req.body, req.params);

    const { message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id; // current logged in user

    // ✅ FIX: $all array me hona chahiye
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // Agar conversation nahi hai to create karo
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // Har case me ek naya message banta hai
    const newMessage = new Message({
      senderId,
      receiverId,
      conversationId: conversation._id,
      message,
    });

    // message ko conversation me add karo
    conversation.messages.push(newMessage._id);

    // dono ko save karo
    await Promise.all([conversation.save(), newMessage.save()]);

    console.log(`📤 SENDING message from ${senderId} to ${receiverId}:`, newMessage.message);
    console.log(`Message object:`, {
        _id: newMessage._id,
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        message: newMessage.message
    });

    // Emit to receiver's user ID room (not individual socket ID)
    io.to(receiverId.toString()).emit("newMessage", newMessage);
    console.log(`🚀 Message emitted to room: ${receiverId}`);

    // Also emit to sender's room for consistency (optional)
    io.to(senderId.toString()).emit("newMessage", newMessage);
    console.log(`🚀 Message also emitted to sender's room: ${senderId}`);

    return res
      .status(201)
      .json({ message: "Message sent successfully", newMessage });
  } catch (error) {
    console.log("Error in Sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessage = async (req, res) => {
  try {
    const { id: chatUser } = req.params;
    const senderId = req.user._id;

     const chatUserId = new mongoose.Types.ObjectId(chatUser);





    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, chatUserId] },
    }).populate("messages");

    if (!conversation) {
      return res.status(200).json({ message: "No conversation found" });
    }

    // Mark messages as read for this conversation when current user views it
    await Message.updateMany(
      {
        conversationId: conversation._id,
        receiverId: senderId,
        isRead: false,
      },
      { isRead: true }
    );

    res.status(200).json({ messages: conversation.messages });
  } catch (error) {
    console.log("Message getting error ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
