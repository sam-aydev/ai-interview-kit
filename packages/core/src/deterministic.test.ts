import { describe, it, expect } from "vitest";
import { getUncoveredRequirements, allocateSchedule } from "./deterministic.js";
import type { Requirement, Question } from "../../shared/src/types.ts";

describe("Deterministic Engine: Coverage Checker", () => {
  const mockRequirements: Requirement[] = [
    {
      id: "req_1",
      text: "5+ years React",
      kind: "technical",
      priority: "must",
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
    {
      id: "req_2",
      text: "Node.js",
      kind: "technical",
      priority: "must",
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
    {
      id: "req_3",
      text: "GraphQL",
      kind: "technical",
      priority: "nice",
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
  ];

  it("should return empty array when all must-haves are covered", () => {
    const questions: Question[] = [
      {
        id: "q_1",
        requirement_ids: ["req_1", "req_2"],
        category: "technical",
        prompt: "",
        answer_outline: "",
        difficulty: 2,
        origin: "generated",
        is_edited: false,
        is_pinned: false,
      },
    ];

    const uncovered = getUncoveredRequirements(mockRequirements, questions);
    expect(uncovered.length).toBe(0);
  });

  it("should flag missing MUST requirements but ignore missing NICE requirements", () => {
    const questions: Question[] = [
      {
        id: "q_1",
        requirement_ids: ["req_1"],
        category: "technical",
        prompt: "",
        answer_outline: "",
        difficulty: 2,
        origin: "generated",
        is_edited: false,
        is_pinned: false,
      },
    ];

    const uncovered = getUncoveredRequirements(mockRequirements, questions);

    expect(uncovered).toContain("req_2"); // Missing must-have
    expect(uncovered).not.toContain("req_3"); // Missing nice-to-have (should be ignored)
    expect(uncovered.length).toBe(1);
  });
});

describe("Deterministic Engine: Schedule Allocator", () => {
  const mockRequirements: Requirement[] = [
    {
      id: "req_1",
      text: "Core Skill",
      kind: "technical",
      priority: "must",
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
    {
      id: "req_2",
      text: "Bonus Skill",
      kind: "technical",
      priority: "nice",
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
  ];

  const mockQuestions: Question[] = [
    {
      id: "q_easy_nice",
      requirement_ids: ["req_2"],
      category: "technical",
      prompt: "",
      answer_outline: "",
      difficulty: 1,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
    {
      id: "q_hard_must",
      requirement_ids: ["req_1"],
      category: "technical",
      prompt: "",
      answer_outline: "",
      difficulty: 3,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
    {
      id: "q_med_must",
      requirement_ids: ["req_1"],
      category: "technical",
      prompt: "",
      answer_outline: "",
      difficulty: 2,
      origin: "generated",
      is_edited: false,
      is_pinned: false,
    },
  ];

  it("should return exactly the number of days requested", () => {
    const schedule = allocateSchedule(mockQuestions, mockRequirements, 5);
    expect(schedule.length).toBe(5);
    expect(schedule[0]?.day).toBe(1);
    expect(schedule[4]?.day).toBe(5);
  });

  it("should front-load harder and priority material to earlier days", () => {
    const schedule = allocateSchedule(mockQuestions, mockRequirements, 3);

    // Day 1 should contain the hardest must-have
    expect(schedule[0]?.question_ids).toContain("q_hard_must");

    // The easiest nice-to-have should end up later in the schedule
    const allIdsSequence = schedule.flatMap((d) => d.question_ids);
    const hardMustIndex = allIdsSequence.indexOf("q_hard_must");
    const easyNiceIndex = allIdsSequence.indexOf("q_easy_nice");

    expect(hardMustIndex).toBeLessThan(easyNiceIndex);
  });

  it("should assign integer minutes", () => {
    const schedule = allocateSchedule(mockQuestions, mockRequirements, 2);
    for (const day of schedule) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });
});
