import { Request, Response } from "express";
import { prismaClient } from "../db";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendMessageSchema } from "../validation/validate";
import logger from "../utils/logger";

const IS_DEV = process.env.NODE_ENV !== "production";

// helper to calculate request size (DEV only)
const getReqSizeKB = (req: Request) => {
  const bodySize = Buffer.byteLength(JSON.stringify(req.body || {}));
  const headersSize = Buffer.byteLength(JSON.stringify(req.headers || {}));
  return ((bodySize + headersSize) / 1024).toFixed(2);
};

// ─────────────────────────────────────────────
// 1️⃣ Send a Message
// ─────────────────────────────────────────────
// 1️⃣ Send a Message
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  if (IS_DEV) {
    console.time("TOTAL /sendMessage");
    // console.log("Request Size (KB):", getReqSizeKB(req));
  }

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // ZOD validation (fast, cpu-bound)
  const parsedBody = sendMessageSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      error: parsedBody.error.errors,
    });
  }

  const { chatId, content } = parsedBody.data;

  // --- Optimization Strategy: "Optimistic Parallel Execution" ---
  // Problem: Latency (India -> US DB) is high (~1s per round trip).
  // Solution: Run the permission check AND the message insert in PARALLEL.
  // Risk: User might insert a message they aren't allowed to.
  // Mitigation: We check the permission result. If it failed, we DELETE the message we just created.
  // Benefit: Saves 1 full second of waiting time.

  if (IS_DEV) console.time("db-parallel-ops");

  const [participant, newMessage] = await Promise.all([
    // Op 1: Check permission (Read)
    prismaClient.chatParticipant.findUnique({
      where: {
        userId_chatId: {
          userId: currentUserId,
          chatId: Number(chatId),
        },
      },
    }),
    // Op 2: Create Message (Write) - using req.user to avoid JOIN
    prismaClient.message.create({
      data: {
        senderId: currentUserId,
        chatId: Number(chatId),
        content: content,
      },
      // ERROR FIX: Removed 'include: sender' to save DB processing time.
      // We already have sender data in req.user!
    }),
  ]);

  if (IS_DEV) console.timeEnd("db-parallel-ops");

  // --- Post-Operation Validation ---
  if (!participant) {
    // 🚨 Security Undo: The user wasn't allowed to send this.
    // Delete the orphan message we just created.
    // This happens in background, we don't make the user wait for the delete confirmation.
    logger.warn(`Potential unauthorized message attempt by user ${currentUserId} in chat ${chatId}`);
    prismaClient.message.delete({ where: { id: newMessage.id } }).catch(e => logger.error("Failed to cleanup unauthorized message", e));

    return res.status(403).json({
      success: false,
      message: "Action forbidden: You are not a member of this chat.",
    });
  }

  // --- Fire-and-Forget Operations ---
  // 1. Update Chat Timestamp (Background)
  prismaClient.chat.update({
    where: { id: Number(chatId) },
    data: { updatedAt: new Date() },
  }).catch((err) => {
    logger.error(`Failed to update chat timestamp in background: ${err}`);
  });

  if (IS_DEV) {
    console.timeEnd("TOTAL /sendMessage");
  }

  // Construct response using local data to avoid DB Join
  const responseData = {
    ...newMessage,
    sender: {
      id: req.user!.id,
      name: req.user!.name,
      pic: req.user!.pic,
    },
  };

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: responseData,
  });
});

// ─────────────────────────────────────────────
// 2️⃣ Fetch messages (PAGINATED)
// ─────────────────────────────────────────────
export const fetchMessages = asyncHandler(
  async (req: Request, res: Response) => {
    if (IS_DEV) console.time("TOTAL /fetchMessages");

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const chatId = Number(req.params.chatId);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const cursor = req.query.cursor
      ? { id: Number(req.query.cursor) }
      : undefined;

    if (IS_DEV) console.time("fetchMessages-db");

    const messages = await prismaClient.message.findMany({
      where: { chatId },
      take: limit,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, name: true, pic: true },
        },
      },
    });

    if (IS_DEV) {
      console.timeEnd("fetchMessages-db");
      console.timeEnd("TOTAL /fetchMessages");
    }

    res.status(200).json({
      success: true,
      data: messages.reverse(), // chronological order
      nextCursor: messages[0]?.id ?? null,
    });
  }
);

// ─────────────────────────────────────────────
// 3️⃣ Delete a message
// ─────────────────────────────────────────────
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response) => {
    if (IS_DEV) console.time("TOTAL /deleteMessage");

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const messageId = Number(req.params.messageId);

    if (IS_DEV) console.time("delete-db");

    const message = await prismaClient.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (message.senderId !== currentUserId) {
      return res
        .status(403)
        .json({ success: false, message: "Action forbidden" });
    }

    await prismaClient.message.delete({
      where: { id: messageId },
    });

    if (IS_DEV) console.timeEnd("TOTAL /deleteMessage");

    res.status(200).json({ success: true });
  }
);
