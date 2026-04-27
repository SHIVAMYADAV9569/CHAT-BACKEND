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
}
 

const users ={} // userId: [socketId1, socketId2, ...]
io.on("connection",(socket)=>{
    console.log("New client connected",socket.id);
    const userId = socket.handshake.query.userId;

     if(userId) {
        if (!users[userId]) users[userId] = [];
        users[userId].push(socket.id);
        console.log("hello",users);
     }
    io.emit("getonline",Object.keys(users))


    socket.on("disconnect",async() => {
        console.log("Client disconnected ",socket.id);
        if(userId && users[userId]){
            users[userId] = users[userId].filter(id => id !== socket.id);
            if (users[userId].length === 0) {
                // Update last seen
                const User = (await import("../models/user.model.js")).default;
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                delete users[userId];
            }
        }
        io.emit("getonline",Object.keys(users));
    });
});

export {app,io,server};