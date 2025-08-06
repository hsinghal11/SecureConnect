import { Router } from "express";
import { fetchUserChats, accessChat } from "../controllers/chat.controller";
import { verifyJWT } from "../middleware/auth.middlerware";

const router = Router();

// Fetch all chats for current user
router.route("/").get(verifyJWT, fetchUserChats);
// Create or access private chat
router.route("/private").post(verifyJWT, accessChat);

export default router;