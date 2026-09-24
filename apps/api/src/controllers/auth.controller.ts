import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "../models/User.js";
import type { AuthRequest } from "../middleware/auth.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret)
      return res.status(500).json({ error: "Server configuration error" });

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, password_hash });

    const token = jwt.sign({ id: user._id, email: user.email }, secret, {
      expiresIn: "7d",
    });
    res.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (error: unknown) {
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const secret = process.env.JWT_SECRET;
    if (!secret)
      return res.status(500).json({ error: "Server configuration error" });

    const user = await UserModel.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, secret, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error: unknown) {
    res.status(500).json({ error: "Login failed" });
  }
};


export const verifySession = async (req: AuthRequest, res: Response) => {
  // If requireAuth middleware passed, the session cookie is valid
  res.json({ authenticated: true, user: req.user });
};