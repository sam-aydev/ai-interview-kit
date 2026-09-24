// apps/api/src/models/Kit.ts
import mongoose, { Schema, Document } from "mongoose";
import type { KitDocument } from "../../../../packages/shared/src/types.ts";

export interface IKit extends KitDocument, Document {
  user_id: string; // In a real app, this references a User model
  status: "draft" | "generating" | "ready" | "failed";
  created_at: Date;
  updated_at: Date;
}

const StateMetadataSchema = new Schema(
  {
    origin: { type: String, enum: ["generated", "user_added"], required: true },
    is_edited: { type: Boolean, default: false },
    is_pinned: { type: Boolean, default: false },
  },
  { _id: false },
);

const KitSchema = new Schema(
  {
    user_id: { type: String, required: true, default: "anonymous_user" }, // Simplified for the assessment
    status: {
      type: String,
      enum: ["draft", "generating", "ready", "failed"],
      default: "generating",
    },

    source: {
      company: String,
      company_url: String,
      role: String,
      location: String,
      jd_chars: Number,
      researched_at: Date,
      pages_used: [String],
    },

    company_brief: {
      summary: String,
      what_they_do: [String],
      sources: [String],
      is_edited: { type: Boolean, default: false },
    },

    role: {
      title: String,
      seniority: String,
      responsibilities: [String],
      requirements: [
        {
          id: String,
          text: String,
          kind: String,
          priority: String,
          ...StateMetadataSchema.obj,
        },
      ],
    },

    questions: [
      {
        id: String,
        requirement_ids: [String],
        category: String,
        prompt: String,
        answer_outline: String,
        difficulty: Number,
        ...StateMetadataSchema.obj,
      },
    ],

    flashcards: [
      {
        id: String,
        front: String,
        back: String,
        confidence: { type: Number, default: 0 },
        requirement_ids: [String],
        ...StateMetadataSchema.obj,
      },
    ],

    schedule: {
      days_available: Number,
      days: [
        {
          day: Number,
          focus: String,
          question_ids: [String],
          minutes: Number,
        },
      ],
    },

    coverage: {
      uncovered_requirement_ids: [String],
      passes: Number,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, optimisticConcurrency: true },
);

export const KitModel = mongoose.model<IKit>("Kit", KitSchema);
