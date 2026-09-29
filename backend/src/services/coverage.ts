import { Requirement, Question, Coverage } from '../types/kit.js';

export interface CoverageResult {
  uncoveredMust: Requirement[];
  uncoveredNice: Requirement[];
  uncovered_requirement_ids: string[];
  isComplete: boolean;
  passes: number;
}

/**
 * Deterministic Coverage Checker Engine
 * Identifies gaps where requirements have 0 associated questions.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageResult {
  const coveredSet = new Set<string>();

  for (const question of questions) {
    if (Array.isArray(question.requirement_ids)) {
      for (const reqId of question.requirement_ids) {
        coveredSet.add(reqId);
      }
    }
  }

  const uncoveredMust: Requirement[] = [];
  const uncoveredNice: Requirement[] = [];
  const uncovered_requirement_ids: string[] = [];

  for (const req of requirements) {
    if (!coveredSet.has(req.id)) {
      uncovered_requirement_ids.push(req.id);
      if (req.priority === 'must') {
        uncoveredMust.push(req);
      } else {
        uncoveredNice.push(req);
      }
    }
  }

  const isComplete = uncoveredMust.length === 0;
  const passes = isComplete ? 1 : 0;

  return {
    uncoveredMust,
    uncoveredNice,
    uncovered_requirement_ids,
    isComplete,
    passes,
  };
}

/**
 * Builds the Appendix A conforming coverage object for a Kit.
 */
export function buildCoverageObject(
  requirements: Requirement[],
  questions: Question[]
): Coverage {
  const result = checkCoverage(requirements, questions);
  return {
    uncovered_requirement_ids: result.uncovered_requirement_ids,
    passes: result.passes,
  };
}
