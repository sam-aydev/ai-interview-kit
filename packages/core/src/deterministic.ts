import type {
  Requirement,
  Question,
  ScheduleDay,
} from "../../shared/src/types.ts";

/**
 * Checks which MUST-HAVE requirements are not covered by any generated questions.
 * This triggers the "Second Pass" generation loop if the array returned is not empty.
 */
export function getUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[],
): string[] {
  // 1. Gather all requirement IDs that have at least one question
  const coveredIds = new Set<string>();
  for (const q of questions) {
    for (const reqId of q.requirement_ids) {
      coveredIds.add(reqId);
    }
  }

  // 2. Filter for 'must' requirements that are missing from the covered set
  return requirements
    .filter((req) => req.priority === "must" && !coveredIds.has(req.id))
    .map((req) => req.id);
}

/**
 * Distributes questions across the available days.
 * Rules met:
 * - Harder/priority material earlier.
 * - Integer minutes.
 * - Exact number of days returned.
 */
export function allocateSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysAvailable: number,
): ScheduleDay[] {
  // 1. Map requirement priorities for quick lookup
  const reqPriorityMap = new Map(requirements.map((r) => [r.id, r.priority]));

  // 2. Calculate time and score each question
  // We assign 15 minutes per difficulty point (diff 1 = 15m, diff 2 = 30m, diff 3 = 45m)
  const scoredQuestions = questions.map((q) => {
    const coversMustHave = q.requirement_ids.some(
      (id) => reqPriorityMap.get(id) === "must",
    );
    return {
      ...q,
      coversMustHave,
      estimatedMinutes: q.difficulty * 15,
    };
  });

  // 3. Sort: Must-haves first, then highest difficulty first
  scoredQuestions.sort((a, b) => {
    if (a.coversMustHave && !b.coversMustHave) return -1;
    if (!a.coversMustHave && b.coversMustHave) return 1;
    return b.difficulty - a.difficulty;
  });

  // 4. Initialize empty days
  const schedule: ScheduleDay[] = Array.from(
    { length: daysAvailable },
    (_, i) => ({
      day: i + 1,
      focus: "",
      question_ids: [],
      minutes: 0,
    }),
  );

  // 5. Fill days sequentially until they hit the daily target time
  const totalMinutes = scoredQuestions.reduce(
    (acc, q) => acc + q.estimatedMinutes,
    0,
  );
  const targetMinutesPerDay = Math.ceil(totalMinutes / daysAvailable) || 30;

  let currentDayIndex = 0;
  for (const sq of scoredQuestions) {
    const currentDay = schedule[currentDayIndex];
    if (!currentDay) break; // TypeScript safety check

    currentDay.question_ids.push(sq.id);
    currentDay.minutes += sq.estimatedMinutes;

    // Move to next day if this one is full (unless we are already on the last day)
    if (
      currentDay.minutes >= targetMinutesPerDay &&
      currentDayIndex < daysAvailable - 1
    ) {
      currentDayIndex++;
    }
  }

  // 6. Generate a readable "focus" for each day based on its dominant category
  const focusLabels: Record<string, string> = {
    technical: "Technical Deep Dive",
    behavioural: "Behavioural & Experience",
    "system-design": "System Design & Architecture",
    "company-fit": "Company Culture & Fit",
  };

  for (const day of schedule) {
    if (day.question_ids.length === 0) {
      day.focus = "Review & Consolidation";
      continue;
    }

    const categories = day.question_ids.map(
      (id) => questions.find((q) => q.id === id)?.category || "technical",
    );
    const dominantCategory =
      categories
        .sort(
          (a, b) =>
            categories.filter((v) => v === a).length -
            categories.filter((v) => v === b).length,
        )
        .pop() || "technical";

    day.focus = focusLabels[dominantCategory] || "Technical Deep Dive";
  }

  return schedule;
}
