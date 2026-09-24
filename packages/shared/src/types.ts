// --- APPENDIX A: KIT STRUCTURE ---

export type RequirementKind = "technical" | "behavioural" | "domain";
export type PriorityLevel = "must" | "nice";
export type QuestionCategory =
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

// Add this base interface at the top
export interface StateMetadata {
  origin: "generated" | "user_added";
  is_edited: boolean;
  is_pinned: boolean;
}

export interface Requirement extends StateMetadata {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: PriorityLevel;
}

export interface Question extends StateMetadata {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: number;
}

export interface Flashcard extends StateMetadata {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  confidence?: number; // Added for Practice Mode
}


export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface KitDocument {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string; // ISO date string
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
}

// --- APPENDIX B: BATCH IO ---

export interface BatchInputCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchOutputResult {
  id: string;
  status: "ok" | "failed";
  kit: KitDocument | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface BatchOutput {
  version: string;
  generated_at: string;
  kits: BatchOutputResult[];
}
