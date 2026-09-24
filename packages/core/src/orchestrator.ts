import type {
  Flashcard,
  KitDocument,
  Question,
  Requirement,
} from "../../shared/src/types.ts";
import { crawlCompany } from "./crawler.js";
import { getUncoveredRequirements, allocateSchedule } from "./deterministic.js";
import { generateJSON } from "./llm.js";
import { randomUUID } from "crypto";

export interface GenerationOptions {
  jd: string;
  companyUrl: string;
  days: number;
  env?: "production" | "batch";
}

export async function generatePrepKit(
  options: GenerationOptions,
): Promise<KitDocument> {
  const { jd, companyUrl, days, env = "production" } = options;

  console.log(`[1/5] Extracting requirements from JD...`);
  // --- STEP 1: EXTRACT REQUIREMENTS ---
  const roleData = await generateJSON<{
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Omit<
      Requirement,
      "id" | "origin" | "is_edited" | "is_pinned"
    >[];
  }>(
    `You are an expert technical recruiter. Extract the role title, seniority, responsibilities, and requirements from the job description. 
     Categorize each requirement's kind ("technical", "behavioural", "domain") and priority ("must", "nice"). Output valid JSON only.`,
    `Job Description:\n${jd}`,
  );

  // Assign stable IDs to requirements (Appendix A rule)
  const requirements: Requirement[] = roleData.requirements.map((req) => ({
    ...req,
    id: `req_${randomUUID().substring(0, 8)}`,
    origin: "generated",
    is_edited: false,
    is_pinned: false,
  }));

  console.log(`[2/5] Crawling company site: ${companyUrl}`);
  // --- STEP 2: RESEARCH COMPANY ---
  const crawl = await crawlCompany(companyUrl, env);

  let companyBrief = {
    summary: "Could not research company.",
    what_they_do: "",
    sources: [] as string[],
  };
  if (crawl.scraped_text) {
    companyBrief = await generateJSON<any>(
      `You are a corporate researcher. Summarize the company and what they do based on the scraped text. Output valid JSON with keys: "summary", "what_they_do".`,
      `Scraped Data:\n${crawl.scraped_text}`,
    );
    companyBrief.sources = crawl.pages_used;
  }

  console.log(`[3/5] Generating Initial Questions...`);
  // --- STEP 3: GENERATE QUESTIONS ---
  // To avoid hitting token limits, we pass the requirements to generate questions.
  const initialQuestionsPayload = await generateJSON<{
    questions: Omit<Question, "id" | "origin" | "is_edited" | "is_pinned">[];
  }>(
    `Generate exactly 6 interview questions based on the requirements provided. 
     Each question MUST reference at least one requirement_id from the list.
     Output valid JSON: { "questions": [ { "requirement_ids": ["req_..."], "category": "technical", "prompt": "...", "answer_outline": "...", "difficulty": 2 } ] }`,
    `Requirements:\n${JSON.stringify(requirements, null, 2)}\n\nCompany Brief:\n${companyBrief.summary}`,
  );

  let questions: Question[] = initialQuestionsPayload.questions.map((q) => ({
    ...q,
    id: `q_${randomUUID().substring(0, 8)}`,
    origin: "generated",
    is_edited: false,
    is_pinned: false,
  }));

  console.log(`[4/5] Checking Coverage & Second Pass...`);
  // --- STEP 4: THE SECOND PASS (Section 4 of the Brief) ---
  let passes = 1;
  const uncoveredIds = getUncoveredRequirements(requirements, questions);

  if (uncoveredIds.length > 0) {
    console.log(
      `Found ${uncoveredIds.length} uncovered MUST-HAVE requirements. Running second pass...`,
    );
    const gapRequirements = requirements.filter((r) =>
      uncoveredIds.includes(r.id),
    );

    const gapQuestionsPayload = await generateJSON<{
      questions: Omit<Question, "id" | "origin" | "is_edited" | "is_pinned">[];
    }>(
      `You MUST generate interview questions specifically targeting these missing requirements. 
       Output JSON format identical to the previous prompt.`,
      `Missing Requirements:\n${JSON.stringify(gapRequirements, null, 2)}`,
    );

    const gapQuestions: Question[] = gapQuestionsPayload.questions.map((q) => ({
      ...q,
      id: `q_${randomUUID().substring(0, 8)}`,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    }));

    questions = [...questions, ...gapQuestions];
    passes = 2;
  }

  // --- STEP 5: FLASHCARDS & SCHEDULE ---
  console.log(`[5/5] Generating Flashcards & Finalizing Schedule...`);
  const flashcardsPayload = await generateJSON<{
    flashcards: Omit<Flashcard, "id" | "origin" | "is_edited" | "is_pinned">[];
  }>(
    `Generate 5 quick-recall flashcards based on the technical and domain requirements.
     Output JSON: { "flashcards": [ { "front": "...", "back": "...", "requirement_ids": ["req_..."] } ] }`,
    `Requirements:\n${JSON.stringify(requirements, null, 2)}`,
  );

  const flashcards: Flashcard[] = flashcardsPayload.flashcards.map((f) => ({
    ...f,
    id: `f_${randomUUID().substring(0, 8)}`,
    origin: "generated",
    is_edited: false,
    is_pinned: false,
  }));

  // Use our Deterministic Engine for the schedule!
  const scheduleDays = allocateSchedule(questions, requirements, days);

  // Assemble the final Kit matching Appendix A strictly
  return {
    source: {
      company: jd.substring(0, 50).includes(companyUrl)
        ? "Extracted"
        : companyUrl, // simplified
      company_url: companyUrl,
      role: roleData.title,
      location: "Remote/Unspecified", // To be refined
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages_used,
    },
    company_brief: companyBrief as any,
    role: {
      title: roleData.title,
      seniority: roleData.seniority,
      responsibilities: roleData.responsibilities,
      requirements: requirements,
    },
    questions,
    flashcards,
    schedule: {
      days_available: days,
      days: scheduleDays,
    },
    coverage: {
      uncovered_requirement_ids: getUncoveredRequirements(
        requirements,
        questions,
      ),
      passes,
    },
  };
}
