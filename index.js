import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoute from "./route/user.route.js";
import messageRoute from "./route/message.route.js";
import { app, server } from "./SocketIO/server.js";
import path from "path";
import fs from "fs";
import net from "net";
dotenv.config();

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4001';
const corsOptions = {
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

// Register API routes
app.use('/api/user', userRoute);
app.use('/api/message', messageRoute);

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5001;
const ALTERNATE_PORT = parseInt(process.env.ALTERNATE_PORT, 10) || 5002;
const ADDITIONAL_PORTS = [5003, 5004, 0];
const portsToTry = [DEFAULT_PORT, ALTERNATE_PORT, ...ADDITIONAL_PORTS];

const isPortAvailable = (port) =>
  new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(err);
      }
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port);
  });

const findFreePort = async () => {
  for (const port of portsToTry) {
    if (port === 0) {
      return new Promise((resolve, reject) => {
        const serverTemp = net.createServer();
        serverTemp.once('error', reject);
        serverTemp.listen(0, () => {
          const assignedPort = serverTemp.address().port;
          serverTemp.close(() => resolve(assignedPort));
        });
      });
    }
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found.');
};

const startServer = (port) => {
  server.listen(port, () => {
    console.log(`Server is Running on port ${port}`);
  });
};

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

const bootstrap = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }

  try {
    const port = await findFreePort();
    if (port !== DEFAULT_PORT && port !== ALTERNATE_PORT) {
      console.warn(`Default ports ${DEFAULT_PORT} and ${ALTERNATE_PORT} are busy, using port ${port}.`);
    } else if (port !== DEFAULT_PORT) {
      console.warn(`Port ${DEFAULT_PORT} is busy, using alternate port ${port}.`);
    }
    startServer(port);
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

bootstrap();
