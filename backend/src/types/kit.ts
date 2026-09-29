import { z } from 'zod';

// Requirement Enums and Schemas
export const RequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);
export type RequirementKind = z.infer<typeof RequirementKindSchema>;

export const RequirementPrioritySchema = z.enum(['must', 'nice']);
export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});
export type Requirement = z.infer<typeof RequirementSchema>;

// Source Schema
export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});
export type Source = z.infer<typeof SourceSchema>;

// Company Brief Schema
export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

// Role Schema
export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});
export type Role = z.infer<typeof RoleSchema>;

// Question Enums and Schemas
export const QuestionCategorySchema = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;

export const QuestionDifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;

export const UserStateSchema = z.enum(['generated', 'edited', 'pinned']);
export type UserState = z.infer<typeof UserStateSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: QuestionCategorySchema,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: QuestionDifficultySchema,
  user_state: UserStateSchema.optional(),
  user_answer: z.string().optional(),
  evaluation: z.any().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

// Flashcard Schema
export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

// Schedule Schemas
export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

export const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

// Coverage Schema
export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});
export type Coverage = z.infer<typeof CoverageSchema>;

// Complete Kit Schema conforming strictly to Appendix A
export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});
export type Kit = z.infer<typeof KitSchema>;

// Evaluation Case Schema (Section 9 & Appendix B)
export const EvaluationCaseSchema = z.object({
  id: z.string(),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive(),
});
export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

// Evaluation Result item schema (Appendix B)
export const KitResultItemSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: KitSchema.nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullable(),
});
export type KitResultItem = z.infer<typeof KitResultItemSchema>;

// Batch CLI Output Schema (Appendix B)
export const EvaluationOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string(),
  kits: z.array(KitResultItemSchema),
});
export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>;
