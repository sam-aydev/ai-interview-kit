import { randomUUID } from "crypto";
import { generateJSON } from "./llm.js";
import { crawlCompany } from "./crawler.js";
import { allocateSchedule, getUncoveredRequirements } from "./deterministic.js";
import type {
  Requirement,
  Question,
  Flashcard,
  KitDocument,
} from "../../shared/src/types.js";

export interface GenerationOptions {
  jd: string;
  companyUrl: string;
  days: number;
  env?: "production" | "batch";
}

export async function generatePrepKit(
  options: GenerationOptions,
): Promise<Partial<KitDocument>> {
  const { jd, companyUrl, days, env = "production" } = options;

  console.log(`[1/5] Extracting requirements from JD...`);

  // --- EXTRACT REQUIREMENTS ---
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
     OUTPUT STRICTLY VALID JSON matching this exact structure:
     {
       "title": "String (The job title)",
       "seniority": "String",
       "responsibilities": ["String", "String"],
       "requirements": [ 
         { 
           "text": "...", 
           "kind": "String (strictly 'technical', 'behavioural', or 'domain')", 
           "priority": "String (strictly 'must' or 'nice')" 
         } 
       ]
     }`,
    `Job Description:\n${jd}`,
  );

  // Safe fallback in case the LLM still uses a variation of the key
  const finalTitle =
    roleData.title ||
    (roleData as any).role_title ||
    (roleData as any).jobTitle ||
    "Untitled Role";

  // Assign stable IDs to requirements
  const requirements: Requirement[] = (roleData.requirements || []).map(
    (req) => ({
      ...req,
      id: `req_${randomUUID().substring(0, 8)}`,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    }),
  );

  console.log(`[2/5] Crawling company site: ${companyUrl}`);
  // --- STEP 2: RESEARCH COMPANY ---
  const crawl = await crawlCompany(companyUrl, env);

  // Initialized as a single string to strictly match Appendix A
  let companyBrief = {
    summary:
      "Could not safely research company website or site blocked crawlers.",
    what_they_do: "Information unavailable", 
    sources: [] as string[],
    is_edited: false,
  };

  if (crawl.scraped_text) {
    try {
      const briefData = await generateJSON<{
        summary: string;
        what_they_do: string;
      }>(
        `You are a corporate researcher. Summarize the company and their core products/services based on the scraped text. 
         Output strictly valid JSON matching this exact structure:
         {
           "summary": "String",
           "what_they_do": "String (A short paragraph or comma-separated list describing what they do)"
         }`,
        `Scraped Data:\n${crawl.scraped_text}`,
      );
      companyBrief = {
        summary: briefData.summary || companyBrief.summary,
        what_they_do: briefData.what_they_do || "Information unavailable",
        sources: crawl.pages_used || [],
        is_edited: false,
      };
    } catch (err) {
      console.warn("Failed to parse company brief", err);
    }
  }

  console.log(`[3/5] Generating Initial Questions...`);
  // GENERATE QUESTIONS
  const initialQuestionsPayload = await generateJSON<{
    questions: Omit<Question, "id" | "origin" | "is_edited" | "is_pinned">[];
  }>(
    `Generate exactly 6 interview questions based on the requirements provided. 
     Each question MUST reference at least one requirement_id from the list.
     The "category" MUST be exactly one of: "technical", "behavioural", "system-design", or "company-fit".
     Output strictly valid JSON matching this structure: 
     { 
       "questions": [ 
         { 
           "requirement_ids": ["req_..."], 
           "category": "technical", 
           "prompt": "...", 
           "answer_outline": "...", 
           "difficulty": "Number (1, 2, or 3)" 
         } 
       ] 
     }`,
    `Requirements:\n${JSON.stringify(requirements, null, 2)}\n\nCompany Brief:\n${companyBrief.summary}`,
  );

  let questions: Question[] = (initialQuestionsPayload.questions || []).map(
    (q) => ({
      ...q,
      id: `q_${randomUUID().substring(0, 8)}`,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    }),
  );

  console.log(`[4/5] Checking Coverage & Second Pass...`);
  // THE SECOND PASS 
  let passes = 1;
  const uncoveredIds = getUncoveredRequirements(requirements, questions);

  if (uncoveredIds.length > 0) {
    console.log(
      `Found ${uncoveredIds.length} uncovered MUST-HAVE requirements. Running second pass...`,
    );
    const gapRequirements = requirements.filter((r) =>
      uncoveredIds.includes(r.id),
    );

    try {
      const gapQuestionsPayload = await generateJSON<{
        questions: Omit<
          Question,
          "id" | "origin" | "is_edited" | "is_pinned"
        >[];
      }>(
        `You MUST generate interview questions specifically targeting these missing requirements. 
         The "category" MUST be exactly one of: "technical", "behavioural", "system-design", or "company-fit".
         Output JSON format identical to the previous prompt: 
         { 
           "questions": [ 
             { 
               "requirement_ids": ["req_..."], 
               "category": "technical", 
               "prompt": "...", 
               "answer_outline": "...", 
               "difficulty": "Number (1, 2, or 3)" 
             } 
           ] 
         }`,
        `Missing Requirements:\n${JSON.stringify(gapRequirements, null, 2)}`,
      );

      const gapQuestions: Question[] = (
        gapQuestionsPayload.questions || []
      ).map((q) => ({
        ...q,
        id: `q_${randomUUID().substring(0, 8)}`,
        origin: "generated",
        is_edited: false,
        is_pinned: false,
      }));

      questions = [...questions, ...gapQuestions];
      passes = 2;
    } catch (err) {
      console.warn(
        "Second pass question generation failed, proceeding with initial questions.",
        err,
      );
    }
  }

  //  FLASHCARDS & SCHEDULE 
  console.log(`[5/5] Generating Flashcards & Finalizing Schedule...`);
  let flashcards: Flashcard[] = [];
  try {
    const flashcardsPayload = await generateJSON<{
      flashcards: Omit<
        Flashcard,
        "id" | "origin" | "is_edited" | "is_pinned"
      >[];
    }>(
      `Generate 5 quick-recall flashcards based on the technical and domain requirements.
       Output JSON: { "flashcards": [ { "front": "...", "back": "...", "requirement_ids": ["req_..."] } ] }`,
      `Requirements:\n${JSON.stringify(requirements, null, 2)}`,
    );

    flashcards = (flashcardsPayload.flashcards || []).map((f) => ({
      ...f,
      id: `f_${randomUUID().substring(0, 8)}`,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    }));
  } catch (err) {
    console.warn("Flashcard generation failed, returning empty array.", err);
  }

  // Use our Deterministic Engine for the schedule!
  const scheduleDays = allocateSchedule(questions, requirements, days);

  // Assemble the final Kit matching Appendix A strictly
  return {
    source: {
      company: companyUrl
        ? new URL(companyUrl).hostname.replace("www.", "")
        : "Unknown",
      company_url: companyUrl,
      role: finalTitle,
      location: "Remote/Unspecified",
      jd_chars: jd?.length || 0,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages_used || [],
    },
    company_brief: companyBrief as any,
    role: {
      title: finalTitle,
      seniority: roleData.seniority || "Unspecified",
      responsibilities: roleData.responsibilities || [],
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