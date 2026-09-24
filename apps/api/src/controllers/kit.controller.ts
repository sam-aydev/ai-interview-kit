import type { Response } from "express";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { KitModel } from "../models/Kit.js";
import type { AuthRequest } from "../middleware/auth.js";
import { generatePrepKit } from "../../../../packages/core/src/orchestrator.js";
import { generateJSON } from "../../../../packages/core/src/llm.js";
import {
  allocateSchedule,
  getUncoveredRequirements,
} from "../../../../packages/core/src/deterministic.js";
import type {
  Question,
  Requirement,
} from "../../../../packages/shared/src/types.js";

// 1. Initialize a global promise chain to act as an in-memory queue
let generationQueue = Promise.resolve();

export const startGeneration = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { jd, company_url, days } = req.body;

  if (!jd || !company_url || !days) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Create the DB record
    const newKit = await KitModel.create({
      user_id: userId,
      status: "generating",
      source: { company_url, jd_chars: jd.length },
    });

    // Instantly respond to the frontend so it can render the "Generating" cards
    res.status(202).json({ id: newKit._id, status: "generating" });

    // 2. Attach the generation task to the queue instead of running it immediately
    generationQueue = generationQueue
      .then(async () => {
        try {
          const generatedData = await generatePrepKit({
            jd,
            companyUrl: company_url,
            days,
          });
          await KitModel.findByIdAndUpdate(newKit._id, {
            ...generatedData,
            status: "ready",
          });
        } catch (error: unknown) {
          console.error(`[API] Kit ${newKit._id} generation failed:`, error);
          await KitModel.findByIdAndUpdate(newKit._id, { status: "failed" });
        }
      })
      .catch(() => {
        // Safe-catch to ensure one catastrophic failure doesn't break the entire queue chain
        console.error(
          `[API] Queue recovered from catastrophic failure on Kit ${newKit._id}`,
        );
      });
  } catch (error: unknown) {
    res.status(500).json({ error: "Failed to initialize generation" });
  }
};

export const getKit = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // 1. Explicitly validate and extract the ID as a string
  const kitId = req.params.id;
  if (!kitId || typeof kitId !== "string") {
    return res.status(400).json({ error: "Invalid kit ID parameter" });
  }

  try {
    const kit = await KitModel.findOne({ _id: kitId, user_id: userId });
    if (!kit)
      return res.status(404).json({ error: "Kit not found or unauthorized" });
    res.json(kit);
  } catch (error: unknown) {
    res.status(500).json({ error: "Failed to fetch kit" });
  }
};

export const getAllKits = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 9;
  const skip = (page - 1) * limit;

  try {
    const kits = await KitModel.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await KitModel.countDocuments({ user_id: userId });

    res.json({
      kits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: "Failed to fetch kits" });
  }
};

export const updateKit = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // 1. Explicitly validate and extract the ID as a string
  const kitId = req.params.id;
  if (!kitId || typeof kitId !== "string") {
    return res.status(400).json({ error: "Invalid kit ID parameter" });
  }

  try {
    const updatedKit = await KitModel.findOneAndUpdate(
      { _id: kitId, user_id: userId },
      req.body,
      { new: true },
    );
    if (!updatedKit)
      return res.status(404).json({ error: "Kit not found or unauthorized" });
    res.json(updatedKit);
  } catch (error: unknown) {
    res.status(500).json({ error: "Failed to update kit" });
  }
};

export const regenerateKit = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Explicitly validate and extract the ID as a string
  const kitId = req.params.id;
  if (!kitId || typeof kitId !== "string") {
    return res.status(400).json({ error: "Invalid kit ID parameter" });
  }

  const { category } = req.body;

  try {
    const kit = await KitModel.findOne({ _id: kitId, user_id: userId });
    if (!kit)
      return res.status(404).json({ error: "Kit not found or unauthorized" });

    const plainKit = kit.toObject();

    const plainQuestions = (plainKit.questions || []) as unknown as Question[];
    const plainRequirements = (plainKit.role?.requirements ||
      []) as unknown as Requirement[];

    const preservedQuestions = plainQuestions.filter(
      (q) =>
        q.category !== category || q.is_pinned === true || q.is_edited === true,
    );

    const neededCount =
      6 -
      plainQuestions.filter(
        (q) => q.category === category && (q.is_pinned || q.is_edited),
      ).length;

    let mergedQuestions: Question[] = preservedQuestions;

    if (neededCount > 0) {
      const prompt = `Generate exactly ${neededCount} new ${category} interview questions based on the requirements. 
        Output JSON: { "questions": [ { "requirement_ids": ["req_..."], "category": "${category}", "prompt": "...", "answer_outline": "...", "difficulty": 2 } ] }`;

      interface LLMPayload {
        questions: Array<
          Omit<Question, "id" | "origin" | "is_edited" | "is_pinned">
        >;
      }

      const newQuestionsPayload = await generateJSON<LLMPayload>(
        prompt,
        `Requirements:\n${JSON.stringify(plainRequirements, null, 2)}`,
      );

      const newQuestions: Question[] = newQuestionsPayload.questions.map(
        (q) => ({
          ...q,
          id: `q_${randomUUID().substring(0, 8)}`,
          origin: "generated" as const,
          is_edited: false,
          is_pinned: false,
        }),
      );

      mergedQuestions = [...preservedQuestions, ...newQuestions];
    }

    const newSchedule = allocateSchedule(
      mergedQuestions,
      plainRequirements,
      kit.schedule?.days_available ?? 3,
    );

    const newCoverage = getUncoveredRequirements(
      plainRequirements,
      mergedQuestions,
    );

    kit.set("questions", mergedQuestions);
    kit.set("schedule.days", newSchedule);
    kit.set("coverage.uncovered_requirement_ids", newCoverage);

    await kit.save();

    res.json(kit);
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.VersionError) {
      console.warn(
        `[Concurrency] Write collision detected for Kit ${req.params.id}`,
      );
      return res.status(409).json({
        error: "Conflict",
        message:
          "The kit was modified by another action while generating. Please refresh and try again.",
      });
    }

    console.error("Regeneration error:", error);
    res.status(500).json({ error: "Failed to regenerate section" });
  }
};
