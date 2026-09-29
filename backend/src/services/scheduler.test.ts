import { describe, it, expect } from 'vitest';
import { buildSchedule, getQuestionMinutes } from './scheduler.js';
import { checkCoverage, buildCoverageObject } from './coverage.js';
import { Requirement, Question } from '../types/kit.js';

describe('Deterministic Arithmetic Scheduler', () => {
  const mockRequirements: Requirement[] = [
    { id: 'r1', text: 'Distributed Systems & Scaling', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js & Express API Design', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Team Leadership & Mentorship', kind: 'behavioural', priority: 'nice' },
    { id: 'r4', text: 'Fintech Domain Knowledge', kind: 'domain', priority: 'nice' },
  ];

  const mockQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'system-design',
      prompt: 'Design a distributed rate limiter.',
      answer_outline: 'Use token bucket with Redis.',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'Explain event loop and async middleware.',
      answer_outline: 'Event loop microtask queue processing.',
      difficulty: 2,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Describe a time you mentored a junior engineer.',
      answer_outline: 'STAR method explanation.',
      difficulty: 1,
    },
    {
      id: 'q4',
      requirement_ids: ['r1', 'r2'],
      category: 'technical',
      prompt: 'How do you optimize Express database queries at scale?',
      answer_outline: 'Connection pooling, indexes, horizontal partitioning.',
      difficulty: 3,
    },
  ];

  it('should generate a valid 1-day schedule', () => {
    const schedule = buildSchedule(mockRequirements, mockQuestions, 1);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].day).toBe(1);
    expect(schedule.days[0].question_ids.length).toBe(4);

    const expectedMinutes = mockQuestions.reduce(
      (sum, q) => sum + getQuestionMinutes(q.difficulty),
      0
    );
    expect(schedule.days[0].minutes).toBe(expectedMinutes);
    expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
  });

  it('should generate a valid 5-day schedule prioritizing harder & must-priority items in earlier days', () => {
    const schedule = buildSchedule(mockRequirements, mockQuestions, 5);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);

    // Harder/must items (difficulty 3, priority must -> q1, q4) should land in early days
    const day1Question = mockQuestions.find((q) => q.id === schedule.days[0].question_ids[0]);
    expect(day1Question).toBeDefined();
    expect(day1Question?.difficulty).toBe(3);

    // Verify all question_ids in schedule exist in mockQuestions
    const scheduledQuestionIds = schedule.days.flatMap((d) => d.question_ids);
    expect(scheduledQuestionIds.length).toBe(mockQuestions.length);
    scheduledQuestionIds.forEach((qId) => {
      expect(mockQuestions.some((q) => q.id === qId)).toBe(true);
    });

    // Ensure all minutes are integers
    schedule.days.forEach((day) => {
      expect(Number.isInteger(day.minutes)).toBe(true);
    });
  });

  it('should generate a valid 14-day schedule and handle empty days cleanly', () => {
    const schedule = buildSchedule(mockRequirements, mockQuestions, 14);
    expect(schedule.days_available).toBe(14);
    expect(schedule.days.length).toBe(14);

    // Days beyond the number of questions should be empty review days
    const emptyDays = schedule.days.filter((d) => d.question_ids.length === 0);
    expect(emptyDays.length).toBe(14 - mockQuestions.length);
    emptyDays.forEach((d) => {
      expect(d.minutes).toBe(0);
      expect(d.focus).toContain('Comprehensive Review');
    });
  });
});

describe('Coverage Checker Engine', () => {
  const requirements: Requirement[] = [
    { id: 'r1', text: 'System Design', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'TypeScript', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'GraphQL', kind: 'technical', priority: 'nice' },
  ];

  it('should mark complete when all must requirements have associated questions', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1', 'r2'],
        category: 'technical',
        prompt: 'System design with TS',
        answer_outline: 'Outline',
        difficulty: 3,
      },
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.isComplete).toBe(true);
    expect(result.uncoveredMust.length).toBe(0);
    expect(result.uncoveredNice.length).toBe(1);
    expect(result.uncoveredNice[0].id).toBe('r3');
    expect(result.uncovered_requirement_ids).toEqual(['r3']);
    expect(result.passes).toBe(1);
  });

  it('should identify uncovered must requirements when missing', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'System design prompt',
        answer_outline: 'Outline',
        difficulty: 2,
      },
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.isComplete).toBe(false);
    expect(result.uncoveredMust.length).toBe(1);
    expect(result.uncoveredMust[0].id).toBe('r2');
    expect(result.uncovered_requirement_ids).toContain('r2');
    expect(result.uncovered_requirement_ids).toContain('r3');
    expect(result.passes).toBe(0);

    const coverageObj = buildCoverageObject(requirements, questions);
    expect(coverageObj.uncovered_requirement_ids).toEqual(['r2', 'r3']);
    expect(coverageObj.passes).toBe(0);
  });
});
