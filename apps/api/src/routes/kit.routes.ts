import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { startGeneration, getKit, getAllKits, updateKit, regenerateKit } from "../controllers/kit.controller.js";

const router = Router();

// All kit routes require authentication
router.use(requireAuth);

router.post("/", startGeneration);
router.get("/", getAllKits);
router.get("/:id", getKit);
router.put("/:id", updateKit);
router.post("/:id/regenerate", regenerateKit);

export default router;