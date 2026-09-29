import { Requirement, Question, Schedule, ScheduleDay } from '../types/kit.js';

/**
 * Returns integer minute duration for a question based on its difficulty rating.
 * Difficulty 3 = 25 mins
 * Difficulty 2 = 15 mins
 * Difficulty 1 = 10 mins
 */
export function getQuestionMinutes(difficulty: 1 | 2 | 3): number {
  if (difficulty === 3) return 25;
  if (difficulty === 2) return 15;
  return 10;
}

function formatCategoryName(category: string): string {
  switch (category) {
    case 'technical':
      return 'Technical Prep';
    case 'system-design':
      return 'System Design';
    case 'behavioural':
      return 'Behavioural';
    case 'company-fit':
      return 'Company Fit';
    default:
      return category;
  }
}

/**
 * Deterministic Arithmetic Scheduler
 * Builds a day-by-day schedule without making any LLM calls.
 *
 * Rules:
 * - Number of days in schedule MUST EQUAL daysAvailable (handles 1-day to 60-days).
 * - Sort topics and questions by priority ('must' requirements first) and difficulty descending (3 -> 2 -> 1).
 * - Integer minute allocation calculated per day based on scheduled questions.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number
): Schedule {
  const safeDays = Math.max(1, Math.floor(daysAvailable));

  // Build requirement priority map
  const mustReqSet = new Set(
    requirements.filter((r) => r.priority === 'must').map((r) => r.id)
  );

  // Score questions for sorting:
  // 1. Priority rank: 2 if associated with any 'must' requirement, 1 if any requirement, 0 otherwise
  // 2. Difficulty: 3 > 2 > 1
  // 3. Requirement coverage count
  // 4. Stable secondary sort by question ID
  const sortedQuestions = [...questions].sort((a, b) => {
    const aHasMust = a.requirement_ids.some((id) => mustReqSet.has(id));
    const bHasMust = b.requirement_ids.some((id) => mustReqSet.has(id));

    const aPriorityRank = aHasMust ? 2 : a.requirement_ids.length > 0 ? 1 : 0;
    const bPriorityRank = bHasMust ? 2 : b.requirement_ids.length > 0 ? 1 : 0;

    if (aPriorityRank !== bPriorityRank) {
      return bPriorityRank - aPriorityRank;
    }

    if (a.difficulty !== b.difficulty) {
      return b.difficulty - a.difficulty;
    }

    if (a.requirement_ids.length !== b.requirement_ids.length) {
      return b.requirement_ids.length - a.requirement_ids.length;
    }

    return a.id.localeCompare(b.id);
  });

  const remainingQuestions = [...sortedQuestions];
  const days: ScheduleDay[] = [];

  for (let dayNum = 1; dayNum <= safeDays; dayNum++) {
    const remainingDaysCount = safeDays - dayNum + 1;
    const countForThisDay = Math.ceil(
      remainingQuestions.length / remainingDaysCount
    );
    const dayQuestions = remainingQuestions.splice(0, countForThisDay);

    const question_ids = dayQuestions.map((q) => q.id);
    const minutes = dayQuestions.reduce(
      (sum, q) => sum + getQuestionMinutes(q.difficulty),
      0
    );

    let focus: string;
    if (dayQuestions.length > 0) {
      const categories = Array.from(
        new Set(dayQuestions.map((q) => formatCategoryName(q.category)))
      );
      focus = `Day ${dayNum}: ${categories.join(' & ')}`;
    } else {
      focus = `Day ${dayNum}: Comprehensive Review & Practice`;
    }

    days.push({
      day: dayNum,
      focus,
      question_ids,
      minutes,
    });
  }

  return {
    days_available: safeDays,
    days,
  };
}
