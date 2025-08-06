import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.util";
import { prismaClient } from "../db";
import { User } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    user?: User | null;
  }
}

export const verifyJWT = asyncHandler(async (req, res, next) => {
  
    const token = req.headers.authorization?.split(" ")[1] || req.cookies.token;
    // console.log(token);
    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }
    
    try {
        const decoded  = jwt.verify(
          token,
          process.env.REFERESH_TOKEN_SECRET as string
        ) as {userId : number};

        const user = await prismaClient.user.findUnique({
            where: {
                id: decoded.userId
            }
        })
        req.user = user; // Attach user info to request object
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
})