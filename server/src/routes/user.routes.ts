import { Request, Response, Router } from "express";
import { loginUser, registerUser, fuzzySearchUserByEmail, getUserPublicKey } from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middlerware";
import { upload } from "../middleware/multer.middleware";

const router  = Router();

router.route("/register").post(
    upload.single("avatar")
    ,registerUser);

router.route("/verify").get(verifyJWT, (req: Request, res: Response) => {
    const user = req.user;
    res.status(200).json({ message: "User verified", user });
});
router.route("/login").post(loginUser);
router.route("/fuzzy-search").get(verifyJWT, fuzzySearchUserByEmail);
router.route("/public-key/:userId").get(verifyJWT, getUserPublicKey);

export default router;