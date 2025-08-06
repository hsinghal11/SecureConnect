import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.util";
import { loginSchema, userSchema } from "../validation/validate";
import bcrypt from "bcrypt";
import { prismaClient } from "../db";
import jwt from "jsonwebtoken";
import { uploadOnCloudinary } from "../utils/cloudinary";

/** User Registration
 * @route POST /api/v1/user/register
 * @desc Register a new user
 * @access Public
 */
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const payLoad = req.body;
    const result = userSchema.safeParse(payLoad);
    const file = req.file as Express.Multer.File;
    
    let avatarPath: string | null = null;
    
    if (file && file.path) {
      const uploadResponse = await uploadOnCloudinary(file.path);
      avatarPath = uploadResponse?.url || null;
    }

    if (!result.success) {
      return res.status(400).json({
        messsage: "Input is wrong for registration",
        error: result.error.errors,
      });
    }

    const { email, name, password, publicKey } = result.data;    

    const isUserExists = await prismaClient.user.findUnique({
      where: {
        email: email,
      },
    });

    if (isUserExists) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const newUser = await prismaClient.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        pic: avatarPath,
        publicKey: publicKey
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  }
);

/** User Login
 * @route POST /api/v1/user/login
 * @desc Login a user
 * @access Public
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const payLoad = req.body;
  console.log(payLoad);
  
  const result = loginSchema.safeParse(payLoad);

  if (!result.success) {
    return res.status(400).json({
      message: "Input is wrong for login",
      error: result.error.errors,
    });
  }

  const { email, password } = result.data;

  const user = await prismaClient.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid password",
    });
  }
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    process.env.REFERESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );

  console.log(`error here at line 107`);

  // Set token as HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(200).json({
    message: "Login successful",
    user: user,
    token: token,
  });
});

/**
 * @route GET /api/v1/user/fuzzy-search?email=xxx
 * @desc Fuzzy search for users by email using trigram similarity
 * @access Private (requires authentication)
 */
export const fuzzySearchUserByEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const email = req.query.email as string;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email query parameter is required" });
    }
    const threshold = 0.3;
    await prismaClient.$executeRawUnsafe(
      `SET pg_trgm.similarity_threshold = ${threshold};`
    );
    const users = (await prismaClient.$queryRawUnsafe(
      `SELECT id, name, email, pic, "publicKey" FROM "User" WHERE email % $1 ORDER BY similarity(email, $1) DESC LIMIT 5;`,
      email
    )) as Array<{
      id: number;
      name: string;
      email: string;
      pic: string;
      publicKey?: string;
    }>;
    console.log(users);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No similar users found" });
    }
    return res.status(200).json({ users });
  }
);

/**
 * @route GET /api/v1/user/public-key/:userId
 * @desc Get a user's public key
 * @access Private (requires authentication)
*/
export const getUserPublicKey = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    const user = await prismaClient.user.findUnique({
        where: { id: Number(userId) },
        select: { publicKey: true } // Select only the public key
    });

    if (!user || !user.publicKey) {
        return res.status(404).json({ message: "User not found or public key not available" });
    }

    return res.status(200).json({ publicKey: user.publicKey });
});
