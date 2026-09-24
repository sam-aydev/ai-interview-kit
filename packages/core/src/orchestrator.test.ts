import { describe, it, expect, vi } from "vitest";
import { generatePrepKit } from "./orchestrator.js";

// Mock the network-heavy modules so tests run instantly and deterministically
vi.mock("./llm.js", () => ({
  generateJSON: vi.fn(async (systemPrompt: string) => {
    if (systemPrompt.includes("role title")) {
      return {
        title: "Frontend Engineer",
        seniority: "Mid",
        responsibilities: ["Build UIs"],
        requirements: [{ text: "React", kind: "technical", priority: "must" }]
      };
    }
    if (systemPrompt.includes("corporate researcher")) {
      return { summary: "Tech Corp", what_they_do: ["Software"] };
    }
    if (systemPrompt.includes("exactly 6 interview questions") || systemPrompt.includes("specifically targeting")) {
      return {
        questions: [{ requirement_ids: ["req_mock"], category: "technical", prompt: "What is a hook?", answer_outline: "State", difficulty: 2 }]
      };
    }
    if (systemPrompt.includes("quick-recall flashcards")) {
      return {
        flashcards: [{ front: "React", back: "UI Library", requirement_ids: ["req_mock"] }]
      };
    }
    return {};
  })
}));

vi.mock("./crawler.js", () => ({
  crawlCompany: vi.fn().mockResolvedValue({
    pages_used: ["https://example.com"],
    scraped_text: "Mocked scraped content",
    errors: []
  })
}));

describe("Orchestrator: Structure Validation", () => {
  it("should assemble a kit that strictly matches the expected JSON schema", async () => {
    const kit = await generatePrepKit({
      jd: "Looking for a React developer",
      companyUrl: "https://example.com",
      days: 3,
      env: "test" as any
    });

    // 1. Validate top-level architectural keys
    expect(kit).toHaveProperty("source");
    expect(kit).toHaveProperty("company_brief");
    expect(kit).toHaveProperty("role");
    expect(kit).toHaveProperty("questions");
    expect(kit).toHaveProperty("flashcards");
    expect(kit).toHaveProperty("schedule");
    expect(kit).toHaveProperty("coverage");

    // 2. Validate strict mapping of the safe fallback title
    expect(kit.role?.title).toBe("Frontend Engineer");
    expect(kit.source?.role).toBe("Frontend Engineer");

    // 3. Validate that generated data receives State Metadata (Crucial for OCC/Regeneration)
    const firstReq = kit.role?.requirements[0];
    expect(firstReq).toHaveProperty("origin", "generated");
    expect(firstReq).toHaveProperty("is_edited", false);
    expect(firstReq).toHaveProperty("is_pinned", false);

    const firstQuestion = kit.questions?.[0];
    expect(firstQuestion).toHaveProperty("origin", "generated");
    expect(firstQuestion).toHaveProperty("is_edited", false);
    expect(firstQuestion).toHaveProperty("is_pinned", false);

    // 4. Validate array structuring
    expect(Array.isArray(kit.questions)).toBe(true);
    expect(Array.isArray(kit.flashcards)).toBe(true);
    expect(Array.isArray(kit.schedule?.days)).toBe(true);
  });
});