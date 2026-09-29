import { z } from 'zod';
import { generateStructuredData } from './llm.js';
import { crawlCompanyWebsite, CrawledContent } from './crawler.js';
import { checkCoverage, buildCoverageObject } from './coverage.js';
import { buildSchedule } from './scheduler.js';
import {
  Kit,
  KitSchema,
  Role,
  RoleSchema,
  Requirement,
  Question,
  QuestionSchema,
  Flashcard,
  FlashcardSchema,
  CompanyBrief,
  CompanyBriefSchema,
} from '../types/kit.js';

export interface PipelineInput {
  jd: string;
  companyUrl: string;
  daysAvailable: number;
  allowLocalUrls?: boolean;
}

// Zod schema for Step A LLM output
const ExtractedRoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      kind: z.enum(['technical', 'behavioural', 'domain']),
      priority: z.enum(['must', 'nice']),
    })
  ),
});

// Zod schema for Step C LLM output
const GeneratedQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      requirement_ids: z.array(z.string()),
      category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
      prompt: z.string(),
      answer_outline: z.string(),
      difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })
  ),
});

// Zod schema for Step D LLM output
const GeneratedFlashcardsSchema = z.object({
  flashcards: z.array(
    z.object({
      id: z.string(),
      front: z.string(),
      back: z.string(),
      requirement_ids: z.array(z.string()),
    })
  ),
});

/**
 * Step A: Extract role requirements from Job Description without hallucination.
 */
export async function extractRequirements(jd: string): Promise<Role> {
  const systemPrompt = `You are an expert technical recruiter and hiring manager.
Your task is to extract exact requirements from a Job Description (JD).
RULES:
1. DO NOT HALLUCINATE. If the JD is a brief 2-line stub, extract ONLY what is stated.
2. Assign stable requirement IDs like "r1", "r2", "r3".
3. Classify kind as 'technical', 'behavioural', or 'domain'.
4. Classify priority as 'must' (core/mandatory skills) or 'nice' (bonus/optional).
5. Output strict JSON matching:
{
  "title": "string",
  "seniority": "string",
  "responsibilities": ["string"],
  "requirements": [{ "id": "r1", "text": "string", "kind": "technical" | "behavioural" | "domain", "priority": "must" | "nice" }]
}`;

  const userPrompt = `Job Description:\n${jd}`;
  const data = await generateStructuredData({ systemPrompt, userPrompt }, ExtractedRoleSchema);

  // Normalize IDs to ensure r1, r2 format
  const normalizedRequirements = data.requirements.map((req, idx) => ({
    ...req,
    id: `r${idx + 1}`,
  }));

  return {
    title: data.title || 'Software Engineer',
    seniority: data.seniority || 'Mid-Senior',
    responsibilities: data.responsibilities,
    requirements: normalizedRequirements,
  };
}

/**
 * Step B: Summarize company brief from crawled website content.
 */
export async function generateCompanyBrief(
  crawledData: CrawledContent,
  companyName: string,
  companyUrl: string
): Promise<CompanyBrief> {
  if (!crawledData.isAvailable || !crawledData.combinedText) {
    return {
      summary: `${companyName} is the target hiring organization for this position.`,
      what_they_do: `External hiring pages or public documentation for ${companyUrl} were unavailable during initial crawl.`,
      sources: crawledData.pages_used,
    };
  }

  const systemPrompt = `You are a corporate intelligence researcher summarizing company details for interview preparation.
Summarize what the company does and their engineering/business background based strictly on the provided website text.
Output JSON format:
{
  "summary": "1-2 sentence high level overview",
  "what_they_do": "Detailed breakdown of their main products/services",
  "sources": ["urls"]
}`;

  const userPrompt = `Company: ${companyName}\nWebsite Content:\n${crawledData.combinedText}`;

  try {
    const res = await generateStructuredData({ systemPrompt, userPrompt }, CompanyBriefSchema);
    return {
      summary: res.summary,
      what_they_do: res.what_they_do,
      sources: crawledData.pages_used.length > 0 ? crawledData.pages_used : [companyUrl],
    };
  } catch (_e) {
    return {
      summary: `${companyName} operates at ${companyUrl}.`,
      what_they_do: 'Building tech products and software services.',
      sources: crawledData.pages_used,
    };
  }
}

/**
 * Step C: Generate categorized questions mapped to requirements.
 */
export async function generateQuestions(
  role: Role,
  uncoveredReqs?: Requirement[]
): Promise<Question[]> {
  const reqsToTarget = uncoveredReqs || role.requirements;

  if (!process.env.GROQ_API_KEY) {
    return reqsToTarget.map((r, idx) => ({
      id: `q_regen_${idx + 1}`,
      requirement_ids: [r.id],
      category: r.kind === 'behavioural' ? 'behavioural' : r.kind === 'domain' ? 'company-fit' : 'technical',
      prompt: `Regenerated target question for ${r.text}`,
      answer_outline: `Key technical and design points for ${r.text}`,
      difficulty: 2 as const,
      user_state: 'generated' as const,
    }));
  }

  const systemPrompt = `You are a Senior Technical Interviewer creating targeted interview questions.
Rules:
1. For technical requirements -> generate 'technical' or 'system-design' questions.
2. For behavioural/mentoring requirements -> generate 'behavioural' or 'company-fit' questions.
3. Difficulty must be integer 1 (easy/conceptual), 2 (medium/practical), or 3 (hard/architectural).
4. Assign stable question IDs ("q1", "q2", etc.).
5. Link question to relevant requirement IDs.
Output JSON:
{
  "questions": [
    {
      "id": "q1",
      "requirement_ids": ["r1"],
      "category": "technical" | "behavioural" | "system-design" | "company-fit",
      "prompt": "question text",
      "answer_outline": "expected key points in answer",
      "difficulty": 1 | 2 | 3
    }
  ]
}`;

  const reqListStr = role.requirements
    .map((r) => `- ID: ${r.id}, Text: "${r.text}"`)
    .join('\n');
  const userPrompt = `Role: ${role.title} (${role.seniority})\nTarget Requirements:\n${reqListStr}`;
  const res = await generateStructuredData({ systemPrompt, userPrompt }, GeneratedQuestionsSchema);

  return res.questions.map((q, idx) => ({
    ...q,
    id: q.id || `q${idx + 1}`,
  }));
}

/**
 * Step D: Generate flashcards linked to requirements.
 */
export async function generateFlashcards(
  role: Role,
  questions: Question[]
): Promise<Flashcard[]> {
  const reqListStr = role.requirements
    .map((r) => `- ID: ${r.id}, Text: "${r.text}"`)
    .join('\n');

  const systemPrompt = `Create rapid study flashcards for technical and behavioural interview revision.
Output JSON format:
{
  "flashcards": [
    {
      "id": "f1",
      "front": "Question/Prompt on front of card",
      "back": "Concise key facts/definition on back of card",
      "requirement_ids": ["r1"]
    }
  ]
}`;

  const userPrompt = `Requirements:\n${reqListStr}`;
  try {
    const res = await generateStructuredData({ systemPrompt, userPrompt }, GeneratedFlashcardsSchema);
    return res.flashcards.map((f, idx) => ({
      ...f,
      id: f.id || `f${idx + 1}`,
    }));
  } catch (_e) {
    // Fallback simple flashcard creation
    return role.requirements.slice(0, 3).map((r, idx) => ({
      id: `f${idx + 1}`,
      front: `Key Concept: ${r.text}`,
      back: `Core requirement for ${role.title} role.`,
      requirement_ids: [r.id],
    }));
  }
}

/**
 * Extracts company name from URL.
 */
function extractCompanyName(companyUrl: string): string {
  try {
    const parsed = new URL(companyUrl);
    const host = parsed.hostname.replace(/^www\./, '');
    const firstPart = host.split('.')[0];
    if (firstPart && firstPart.length > 1) {
      return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    }
  } catch (_e) {}
  return 'Target Company';
}

/**
 * Fallback generator when GROQ_API_KEY is not configured or in local offline mode.
 */
function generateFallbackKit(input: PipelineInput): Kit {
  const companyName = extractCompanyName(input.companyUrl);
  const now = new Date().toISOString();

  const requirements: Requirement[] = [
    { id: 'r1', text: 'Core Backend API Development & Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Frontend Engineering & Modern React', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'System Architecture & Scalability', kind: 'technical', priority: 'must' },
    { id: 'r4', text: 'Database Design & Optimization', kind: 'technical', priority: 'nice' },
    { id: 'r5', text: 'Cross-functional Communication', kind: 'behavioural', priority: 'nice' },
  ];

  const questions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r3'],
      category: 'system-design',
      prompt: 'Design a high-availability backend service for managing interview kits.',
      answer_outline: 'Use load balanced microservices, Redis caching, and async worker queues.',
      difficulty: 3,
    },
    {
      id: 'q2',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'How do you handle async error handling in Express TypeScript middleware?',
      answer_outline: 'Use custom error classes and central error handling middleware.',
      difficulty: 2,
    },
    {
      id: 'q3',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'Compare React Server Components vs Client Components in Next.js App Router.',
      answer_outline: 'Server components execute on server reducing JS bundle size.',
      difficulty: 2,
    },
    {
      id: 'q4',
      requirement_ids: ['r4'],
      category: 'technical',
      prompt: 'How do you index and optimize slow MongoDB aggregation queries?',
      answer_outline: 'Place $match first using covered compound indexes.',
      difficulty: 2,
    },
    {
      id: 'q5',
      requirement_ids: ['r5'],
      category: 'behavioural',
      prompt: 'Describe how you handle technical disagreements with team members.',
      answer_outline: 'Drive data-based benchmarking and consensus reviews.',
      difficulty: 1,
    },
  ];

  const flashcards: Flashcard[] = [
    { id: 'f1', front: 'Express Error Middleware Signature', back: '(err, req, res, next)', requirement_ids: ['r1'] },
    { id: 'f2', front: 'Next.js App Router Server Actions', back: 'Asynchronous server functions callable from UI components', requirement_ids: ['r2'] },
  ];

  const schedule = buildSchedule(requirements, questions, input.daysAvailable);
  const coverage = buildCoverageObject(requirements, questions);

  return KitSchema.parse({
    source: {
      company: companyName,
      company_url: input.companyUrl,
      role: 'Full-Stack Engineer',
      location: 'Remote / Hybrid',
      jd_chars: input.jd.length,
      researched_at: now,
      pages_used: [input.companyUrl],
    },
    company_brief: {
      summary: `${companyName} is the hiring organization.`,
      what_they_do: 'Building scalable software and developer applications.',
      sources: [input.companyUrl],
    },
    role: {
      title: 'Full-Stack Engineer',
      seniority: 'Senior',
      responsibilities: [
        'Design and implement Node.js API services',
        'Build frontend web applications with Next.js',
      ],
      requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage,
  });
}

/**
 * Full Step-by-Step Research & Generation Pipeline with Second Pass Coverage Loop
 */
export async function executePipeline(input: PipelineInput): Promise<Kit> {
  if (!process.env.GROQ_API_KEY) {
    console.warn('[Pipeline] GROQ_API_KEY not found. Operating in deterministic fallback mode.');
    return generateFallbackKit(input);
  }

  const companyName = extractCompanyName(input.companyUrl);
  const now = new Date().toISOString();

  // 1. Crawl website
  const crawledData = await crawlCompanyWebsite(input.companyUrl, {
    allowLocal: input.allowLocalUrls,
  });

  // 2. Step A: Extract requirements
  const role = await extractRequirements(input.jd);

  // 3. Step B: Generate company brief
  const companyBrief = await generateCompanyBrief(crawledData, companyName, input.companyUrl);

  // 4. Step C: Generate questions
  let questions = await generateQuestions(role);

  // 5. Step E: Deterministic Coverage Check & Second Pass Loop
  let passCount = 1;
  const maxPasses = 3;

  while (passCount < maxPasses) {
    const coverageStatus = checkCoverage(role.requirements, questions);
    if (coverageStatus.isComplete || coverageStatus.uncoveredMust.length === 0) {
      break; // All must requirements covered!
    }

    passCount++;
    console.warn(
      `[Pipeline Pass ${passCount}] ${coverageStatus.uncoveredMust.length} uncovered 'must' requirements detected. Running Pass ${passCount}...`
    );

    try {
      const targetedQuestions = await generateQuestions(role, coverageStatus.uncoveredMust);
      // Re-id targeted questions to avoid collisions
      const nextQIdx = questions.length + 1;
      const reindexedTargeted = targetedQuestions.map((q, idx) => ({
        ...q,
        id: `q${nextQIdx + idx}`,
      }));

      questions = [...questions, ...reindexedTargeted];
    } catch (_passErr) {
      console.warn(`[Pipeline Pass ${passCount}] Second pass question generation encountered an issue.`);
      break;
    }
  }

  // 6. Step D: Generate flashcards
  const flashcards = await generateFlashcards(role, questions);

  // 7. Step F: Arithmetic Schedule Allocation
  const schedule = buildSchedule(role.requirements, questions, input.daysAvailable);

  // 8. Coverage Object
  const coverageStatus = checkCoverage(role.requirements, questions);
  const coverage = {
    uncovered_requirement_ids: coverageStatus.uncovered_requirement_ids,
    passes: passCount,
  };

  const rawKit = {
    source: {
      company: companyName,
      company_url: input.companyUrl,
      role: role.title,
      location: 'Remote / Hybrid',
      jd_chars: input.jd.length,
      researched_at: now,
      pages_used: crawledData.pages_used.length > 0 ? crawledData.pages_used : [input.companyUrl],
    },
    company_brief: companyBrief,
    role,
    questions,
    flashcards,
    schedule,
    coverage,
  };

  return KitSchema.parse(rawKit);
}
