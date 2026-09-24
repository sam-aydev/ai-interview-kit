import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

interface UserPayload extends JwtPayload {
  id: string;
  email: string;
}

function isUserPayload(payload: string | JwtPayload): payload is UserPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    "email" in payload
  );
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Malformed token" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      "[CRITICAL] JWT_SECRET is not defined in environment variables.",
    );
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (!isUserPayload(decoded)) {
      res.status(401).json({ error: "Unauthorized: Invalid token structure" });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown verification error";
    console.warn(`[Auth] Token verification failed: ${errorMessage}`);
    res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
  }
};
