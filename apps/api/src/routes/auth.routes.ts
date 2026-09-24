import { Router } from "express";
import {
  register,
  login,
  verifySession,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify", requireAuth, verifySession);

export default router;
