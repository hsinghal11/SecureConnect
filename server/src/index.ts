import express from "express";
import { Server, Socket } from "socket.io";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { prismaClient } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}))
app.use(cookieParser());
const PORT = 8000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
})) 

io.on("connection", (socket: Socket) => {
    console.log("USer connected", socket.id);  
    socket.on("hello", (data) => {
        // log.info("Hello event received", data);
        console.log("Hello event received", data);
        io.emit("hello", `${data}`);
    });
    // Join chat room
    socket.on("join_chat", (chatId) => {
        socket.join(`chat_${chatId}`);
    });
    // Send message
    socket.on("new message", (newMessageReceived) => {
      console.log("New message received via socket:", newMessageReceived);
      
      // Broadcast the message to all users in the chat room
      const chatId = newMessageReceived.chatId;
      if (chatId) {
        socket.to(`chat_${chatId}`).emit("message received", newMessageReceived);
        console.log(`Broadcasted message to chat_${chatId}`);
      }
    });
    });
// });

app.get("/", (req, res) => {
  res.send("Hello from TypeScript + Express!");
});

// import routers 

import userRouter from "./routes/user.routes";
import messageRouter from "./routes/message.routes";
import chatRouter from "./routes/chat.routes"
import { errorHandler } from "./middleware/errorHandler";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/message", messageRouter);

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
