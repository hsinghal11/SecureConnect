import { Request, Response } from "express";
import { prismaClient } from "../db";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendMessageSchema } from "../validation/validate";

// 1️⃣ Send a Message
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const parsedBody = sendMessageSchema.safeParse(req.body);
  if(!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      error: parsedBody.error.errors,
    });
  }
  const { chatId, content } = parsedBody.data;

  // --- Validation ---
  if (!currentUserId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!chatId || !content) {
    return res
      .status(400)
      .json({ success: false, message: "chatId and content are required" });
  }

  // --- Authorization ---
  // Manually verify that the sender is a participant of the chat.
  const participant = await prismaClient.chatParticipant.findUnique({
    where: {
      userId_chatId: {
        userId: currentUserId,
        chatId: Number(chatId),
      },
    },
  });

  if (!participant) {
    return res.status(403).json({
      success: false,
      message: "Action forbidden: You are not a member of this chat.",
    });
  }

  // --- Database Operations ---
  // We perform two operations in a transaction to ensure data integrity.
  const [newMessage] = await prismaClient.$transaction([
    // 1. Create the new message.
    prismaClient.message.create({
      data: {
        senderId: currentUserId,
        chatId: Number(chatId),
        content: content, // The JSON object with encrypted content for each user.
      },
      include: {
        // Include sender details for immediate use on the client-side.
        sender: {
          select: {
            id: true,
            name: true,
            pic: true,
          },
        },
      },
    }),
    // 2. Update the parent chat's 'updatedAt' timestamp.
    // This is crucial for sorting the user's chat list correctly.
    prismaClient.chat.update({
      where: {
        id: Number(chatId),
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  // Emit the 'newMessage' object over WebSocket to the chat room.
  // Note: Socket emission is handled in the frontend after successful message creation
  // to ensure the encrypted content is properly broadcasted

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: newMessage,
  });
});

// 2️⃣ Fetch all messages for a chat
export const fetchMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?.id;
    const { chatId } = req.params;

    // --- Validation ---
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: "Chat ID is required" });
    }

    // --- Authorization ---
    // Verify that the user requesting messages is a participant of the chat.
    const participant = await prismaClient.chatParticipant.findUnique({
      where: {
        userId_chatId: {
          userId: currentUserId,
          chatId: Number(chatId),
        },
      },
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "Action forbidden: You are not a member of this chat.",
      });
    }

    // --- Database Operation ---
    const messages = await prismaClient.message.findMany({
      where: { chatId: Number(chatId) },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            pic: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ success: true, data: messages });
  }
);

// 3️⃣ Delete a message
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?.id;
    const { messageId } = req.params;

    // --- Validation ---
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!messageId) {
      return res
        .status(400)
        .json({ success: false, message: "Message ID is required" });
    }

    // --- Authorization ---
    const message = await prismaClient.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Only the original sender of the message can delete it.
    if (message.senderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message:
          "Action forbidden: You are not authorized to delete this message",
      });
    }

    // --- Database Operation ---
    await prismaClient.message.delete({ where: { id: Number(messageId) } });

    // TODO: Emit a 'messageDeleted' event over WebSocket.

    res
      .status(200)
      .json({ success: true, message: "Message deleted successfully" });
  }
);
