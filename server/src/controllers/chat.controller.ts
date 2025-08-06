import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.util";
import { prismaClient } from "../db";
import { accessChatSchema } from "../validation/validate";

// A consistent selection of user fields to avoid exposing sensitive data.
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  pic: true,
  publicKey: true,
};

// 1️⃣ Fetch all chats for the currently logged-in user
export const fetchUserChats = asyncHandler(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find all chats where the current user is a participant.
    const chats = await prismaClient.chat.findMany({
      where: {
        participants: {
          some: { userId: currentUserId },
        },
      },
      // Include the other participant's details and the last message for chat list previews.
      include: {
        participants: {
          where: {
            // Exclude the current user from the participants list to easily identify the other person.
            NOT: { userId: currentUserId },
          },
          include: {
            user: { select: safeUserSelect },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the most recent message.
        },
      },
      orderBy: {
        updatedAt: "desc", // Show the most recently active chats first.
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chats fetched successfully",
      data: chats,
    });
  }
);

// 2️⃣ Access a 1-on-1 chat with another user (creates it if it doesn't exist)
export const accessChat = asyncHandler(async (req: Request, res: Response) => {
  // The ID of the user we want to chat with.

  const parsedBody = accessChatSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      error: parsedBody.error.errors,
    });
  }

  const currentUserId = req.user?.id;
  const otherUserId  = parsedBody.data.otherUserId;
  

  // --- Input Validation ---
  if (!otherUserId) {
    return res
      .status(400)
      .json({ success: false, message: "otherUserId is required" });
  }

  if (!currentUserId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (currentUserId === otherUserId) {
    return res
      .status(400)
      .json({
        success: false,
        message: "You cannot create a chat with yourself.",
      });
  }

  // --- Find Existing Chat ---
  // A 1-on-1 chat is defined by having exactly two participants: the current user and the other user.
  const existingChat = await prismaClient.chat.findFirst({
    where: {
      // The AND clause ensures the chat must contain BOTH users.
      AND: [
        { participants: { some: { userId: currentUserId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: safeUserSelect },
        },
      },
    },
  });

  // If chat already exists, return it.
  if (existingChat) {
    return res.status(200).json({
      success: true,
      message: "Chat accessed successfully",
      data: existingChat,
    });
  }

  // --- Create New Chat ---
  // If no chat exists, create a new one and add both users as participants.
  try {
    const newChat = await prismaClient.chat.create({
      data: {
        // Create the link to the participants in the join table.
        participants: {
          create: [{ userId: currentUserId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: newChat,
    });
  } catch (error) {
    // This can happen if the otherUserId doesn't exist in the User table.
    console.error("Error creating chat:", error);
    return res
      .status(400)
      .json({
        success: false,
        message: "Could not create chat. The other user may not exist.",
      });
  }
});
