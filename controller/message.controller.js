import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { getReceiverSocketId } from "../SocketIO/server.js";

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
      message,
    });

    // message ko conversation me add karo
    conversation.messages.push(newMessage._id);

    // dono ko save karo
    await Promise.all([conversation.save(), newMessage.save()]);
    const receiversocketId =getReceiverSocketId(receiverId);
    if(receiversocketId){
      io.to(receiversocketId).emit("newMessage",newMessage);
    }

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
      return res.status(200).json({message: "No conversation found"} );
    }

    res.status(200).json({messages: conversation.messages });
  } catch (error) {
    console.log("Message getting error ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
