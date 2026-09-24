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
import { z } from "zod";

// STRICT APPENDIX A SCHEMA VALIDATION ---
const KitSchemaValidator = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number(),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        kind: z.enum(["technical", "behavioural", "domain"]),
        priority: z.enum(["must", "nice"]),
        origin: z.string().optional(),
        is_edited: z.boolean().optional(),
        is_pinned: z.boolean().optional(),
      })
    ),
  }),
  questions: z.array(
    z.object({
      id: z.string(),
      requirement_ids: z.array(z.string()),
      category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
      prompt: z.string(),
      answer_outline: z.string(),
      difficulty: z.number().int().min(1).max(3),
      origin: z.string().optional(),
      is_edited: z.boolean().optional(),
      is_pinned: z.boolean().optional(),
    })
  ),
  flashcards: z.array(
    z.object({
      id: z.string(),
      front: z.string(),
      back: z.string(),
      requirement_ids: z.array(z.string()),
      origin: z.string().optional(),
      is_edited: z.boolean().optional(),
      is_pinned: z.boolean().optional(),
    })
  ),
  schedule: z.object({
    days_available: z.number(),
    days: z.array(
      z.object({
        day: z.number(),
        focus: z.string(),
        question_ids: z.array(z.string()),
        minutes: z.number().int(),
      })
    ),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number(),
  }),
});


// IN-MEMORY QUEUE
let generationQueue = Promise.resolve();

export const startGeneration = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { jd, company_url, days } = req.body;

  if (!jd || !company_url || !days) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    //  DOUBLE-TRIGGER PREVENTION ---
    const recentDuplicate = await KitModel.findOne({
      user_id: userId,
      "source.company_url": company_url,
      "source.jd_chars": jd.length,
      status: "generating",
      created_at: { $gt: new Date(Date.now() - 3 * 60 * 1000) }, 
    });

    if (recentDuplicate) {
      return res.status(409).json({ 
        error: "Generation already in progress for this job description.",
        id: recentDuplicate._id 
      });
    }

    // IMMEDIATE RESPONSE (Solves the "Takes 90 seconds" timeout problem)
    const newKit = await KitModel.create({
      user_id: userId,
      status: "generating",
      source: { company_url, jd_chars: jd.length },
    });

    res.status(202).json({ id: newKit._id, status: "generating" });

    // ASYNC PROCESSING (Solves the "Fails halfway" problem)
    generationQueue = generationQueue
      .then(async () => {
        try {
          const generatedData = await generatePrepKit({
            jd,
            companyUrl: company_url,
            days,
          });

          // STRICT VALIDATION BEFORE SAVING
          // Throws an error immediately if the LLM hallucinated the structure
          const validatedData = KitSchemaValidator.parse(generatedData);

          await KitModel.findByIdAndUpdate(newKit._id, {
            ...validatedData,
            status: "ready",
          });
        } catch (error: any) {
          console.error(`[API] Kit ${newKit._id} failed validation or generation:`, error.message);
          // Graceful midway failure handling
          await KitModel.findByIdAndUpdate(newKit._id, { status: "failed" });
        }
      })
      .catch(() => {
        console.error(`[API] Queue recovered from fatal failure on Kit ${newKit._id}`);
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
