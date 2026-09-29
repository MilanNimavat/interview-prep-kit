import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { findKitById } from '../services/db.js';
import { generateStructuredData } from '../services/llm.js';

const router = Router();
router.use(requireAuth);

const EvaluateAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  userAnswer: z.string().min(3, 'userAnswer must be at least 3 characters'),
});

const EvaluationResultSchema = z.object({
  score: z.number().int().min(1).max(10),
  strengths: z.array(z.string()),
  missing_key_points: z.array(z.string()),
  suggested_refinement: z.string(),
  ready_for_interview: z.boolean(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

function generateFallbackEvaluation(
  prompt: string,
  userAnswer: string,
  answerOutline: string
): EvaluationResult {
  const wordsCount = userAnswer.trim().split(/\s+/).length;
  let score = 5;

  if (wordsCount > 40) score += 2;
  if (wordsCount > 80) score += 1;

  // Basic check if user answer shares key terms with outline
  const outlineTerms = answerOutline.toLowerCase().split(/\s+/);
  const userTerms = new Set(userAnswer.toLowerCase().split(/\s+/));

  let matched = 0;
  for (const term of outlineTerms) {
    if (term.length > 3 && userTerms.has(term)) {
      matched++;
    }
  }

  if (matched > 2) score += 1;
  score = Math.min(10, Math.max(1, score));

  const ready_for_interview = score >= 7;

  return {
    score,
    strengths: [
      'Addressed the core concept of the interview question.',
      'Demonstrated practical problem solving approach.',
    ],
    missing_key_points: [
      `Consider elaborating more on: ${answerOutline.slice(0, 100)}...`,
    ],
    suggested_refinement:
      'Structure your response clearly: start with a high-level summary, detail your implementation approach, and conclude with trade-offs or scalability considerations.',
    ready_for_interview,
  };
}

// POST /api/kits/:id/evaluate-answer
router.post('/:id/evaluate-answer', async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = EvaluateAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { questionId, userAnswer } = parseResult.data;
    const userId = req.user!.userId;
    const record = await findKitById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    if (record.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this kit.' });
    }

    const question = record.kitData.questions.find((q) => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: `Question with ID ${questionId} not found in this kit.` });
    }

    if (!process.env.GROQ_API_KEY) {
      const fallbackEval = generateFallbackEvaluation(
        question.prompt,
        userAnswer,
        question.answer_outline
      );
      return res.json({ evaluation: fallbackEval });
    }

    const systemPrompt = `You are a Principal Technical Interviewer evaluating a candidate's mock interview response.
Evaluate the user's answer against the question prompt, category, and expected answer outline.
Provide rigorous, constructive, actionable feedback.
Output JSON format matching:
{
  "score": integer between 1 and 10,
  "strengths": ["1-3 key positive points demonstrated in the answer"],
  "missing_key_points": ["1-3 critical concepts or trade-offs omitted"],
  "suggested_refinement": "Clear advice on how to structure a top-tier answer",
  "ready_for_interview": true if score >= 7 else false
}`;

    const userPrompt = `Question Prompt: "${question.prompt}"
Category: ${question.category}
Expected Key Points Outline: "${question.answer_outline}"

Candidate Answer:
"${userAnswer}"`;

    try {
      const evalResult = await generateStructuredData(
        { systemPrompt, userPrompt, temperature: 0.1 },
        EvaluationResultSchema
      );
      return res.json({ evaluation: evalResult });
    } catch (_llmErr) {
      const fallbackEval = generateFallbackEvaluation(
        question.prompt,
        userAnswer,
        question.answer_outline
      );
      return res.json({ evaluation: fallbackEval });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to evaluate answer' });
  }
});

export default router;
