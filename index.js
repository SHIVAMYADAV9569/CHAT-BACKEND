import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoute from "./route/user.route.js";
import messageRoute from "./route/message.route.js";
import { app, server } from "./SocketIO/server.js";
import path from "path";
dotenv.config();

app.use(express.json());
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = [
  clientUrl,
  "http://127.0.0.1:5173",
  "http://localhost:4001",
  "http://127.0.0.1:4001",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
const PORT = process.env.PORT || 5001;
const URI = process.env.MONGODB_URI;
try{
    mongoose.connect(URI);
    console.log("MongoDB Connected");
}
catch (error) {
    console.log(error);
}

app.get("/" , (req , res) => {
  res.send("hello world");
});
app.use("/api/user", userRoute);
app.use("/api/message", messageRoute);


//...........code for deployment

// if (process.env.MODE_ENV ==='prodution'){
//   const dirPath = path.resolv();
//   app.use(express.static("./Frontend/dist"));
//   app.get('*',(req,res) => {
//     res.sendFile(path.resolve(dirPath,'./Frontend/dist','index.html'));
//   });
// }

server.listen(PORT, () => {
  console.log(`Server is Running on port ${PORT}`);
});
