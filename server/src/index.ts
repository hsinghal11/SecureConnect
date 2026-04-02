import "dotenv/config";
import express from "express";
import { Server, Socket } from "socket.io";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { prismaClient } from "./db";
import logger from "./utils/logger";

const app = express();

const PORT = process.env.PORT || 8000;
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
    skip: (req, res) =>
      process.env.NODE_ENV === "production" && res.statusCode < 400,
  }),
);
app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket: Socket) => {
  logger.debug(`User connected: ${socket.id}`);

  socket.on("hello", (data) => {
    logger.debug(`Hello event received: ${data}`);
    console.log(`Hello event received: ${data}`);
    io.emit("hello", `${data}`);
  });

  // Join chat room
  socket.on("join_chat", (chatId) => {
    console.log(`User ${socket.id} joining chat room: chat_${chatId}`);
    socket.join(`chat_${chatId}`);
  });

  // Send message via socket
  socket.on("new message", async (newMessageReceived) => {
    console.log(`New message received: ${JSON.stringify(newMessageReceived)}`);
    logger.debug(
      `New message received via socket: ${JSON.stringify(newMessageReceived)}`,
    );

    const chatId = newMessageReceived.chatId;
    const senderId = newMessageReceived.senderId;
    const content = newMessageReceived.content;

    // Validate required fields
    if (!chatId || !senderId || !content) {
      logger.warn(
        `Invalid message data: chatId=${chatId}, senderId=${senderId}, content=${!!content}`,
      );
      return;
    }

    // Broadcast the message to all users in the chat room IMMEDIATELY (non-blocking)
    socket.to(`chat_${chatId}`).emit("message received", newMessageReceived);
    logger.debug(`Broadcasted message to chat_${chatId}`);

    // Save message to database ASYNCHRONOUSLY (fire and forget)
    // First verify user is a participant, then save
    prismaClient.chatParticipant
      .findUnique({
        where: {
          userId_chatId: {
            userId: Number(senderId),
            chatId: Number(chatId),
          },
        },
      })
      .then(async (participant) => {
        if (!participant) {
          logger.warn(
            `Unauthorized message attempt: user ${senderId} not in chat ${chatId}`,
          );
          return;
        }

        // User is authorized, save message
        return prismaClient.message.create({
          data: {
            chatId: Number(chatId),
            senderId: Number(senderId),
            content: content,
          },
        });
      })
      .then(() => {
        logger.debug(
          `Message saved to DB: chatId=${chatId}, senderId=${senderId}`,
        );

        // Update chat's updatedAt timestamp in background
        prismaClient.chat
          .update({
            where: { id: Number(chatId) },
            data: { updatedAt: new Date() },
          })
          .catch((err) => {
            logger.error(`Failed to update chat timestamp: ${err}`);
          });
      })
      .catch((err) => {
        logger.error(
          `Failed to process message for DB: chatId=${chatId}, senderId=${senderId}, error=${err}`,
        );
      });
    })
  });


app.get("/", (req, res) => {
  res.send("Hello from TypeScript + Express!");
});

// import routers

import userRouter from "./routes/user.routes";
import messageRouter from "./routes/message.routes";
import chatRouter from "./routes/chat.routes";
import { errorHandler } from "./middleware/errorHandler";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/message", messageRouter);

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);

  // Keep Neon DB alive
  const pingDb = async () => {
    try {
      await prismaClient.$executeRaw`SELECT 1`;
      // logger.debug("Keep-alive DB ping successful");
    } catch (error) {
      logger.error(`Keep-alive DB ping failed: ${error}`);
    }
  };

  pingDb(); // Run immediately on start
  setInterval(pingDb, 240000); // Then run every 4 minutes
});
