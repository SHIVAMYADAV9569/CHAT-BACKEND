import { Server} from "socket.io";
import  http  from "http";
import express  from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: "*",
        methods:["GET","POST"]
    }
});


//real time message code
export const getReceiverSocketId = (receiverId) => {
  return users[receiverId] || [];
};

const users = {}; // userId: [socketId1, socketId2, ...]
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("join", async (userId) => {
    if (!userId) return;
    if (!users[userId]) users[userId] = [];
    users[userId].push(socket.id);
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
    console.log("Current users:", users);
    io.emit("getonline", Object.keys(users));
  });

  socket.on("callUser", ({ userToCall, signalData, from, name, callType }) => {
    console.log(`Incoming call from ${from} (${name}) to ${userToCall} - Type: ${callType}`);
    io.to(userToCall).emit("incomingCall", {
      from,
      name,
      signal: signalData,
      callType,
    });
  });

  socket.on("answerCall", ({ to, signalData }) => {
    console.log(`Call answered, sending back to ${to}`);
    io.to(to).emit("callAnswered", {
      signal: signalData,
    });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    console.log(`ICE candidate sent to ${to}`);
    io.to(to).emit("iceCandidate", { candidate });
  });

  socket.on("endCall", ({ to }) => {
    console.log(`Call ended, notifying ${to}`);
    io.to(to).emit("callEnded");
  });

  socket.on("disconnect", async () => {
    console.log("Client disconnected ", socket.id);

    const userId = Object.keys(users).find((key) =>
      users[key].includes(socket.id)
    );
    if (userId && users[userId]) {
      users[userId] = users[userId].filter((id) => id !== socket.id);
      if (users[userId].length === 0) {
        const User = (await import("../models/user.model.js")).default;
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        delete users[userId];
      }
    }
    io.emit("getonline", Object.keys(users));
  });
});

export {app,io,server};

// Export io for use in other files for emitting events
export const emitUserUpdate = (userId, userData) => {
  io.emit("userUpdated", { userId, userData });
};