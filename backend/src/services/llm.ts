import Groq from 'groq-sdk';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'mixtral-8x7b-32768'
];

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is missing.');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Strips markdown code fences (```json ... ```) and cleans raw LLM string output for JSON parsing.
 */
export function cleanJsonResponse(rawContent: string): any {
  let text = rawContent.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return JSON.parse(text);
}

/**
 * Helper delay function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  maxRetries?: number;
  temperature?: number;
}

/**
 * Calls Groq API with robust model waterfalling.
 * - If a model is missing (404) or decommissioned (400), it instantly tries the next model.
 * - Handles exponential backoff + jitter on 429/503 limits.
 */
export async function generateStructuredData<T>(
  options: LLMOptions,
  schema: z.ZodSchema<T>
): Promise<T> {
  const client = getGroqClient();
  const maxRetries = options.maxRetries ?? 4;
  
  let currentModelIndex = 0;
  let attempt = 1;

  while (attempt <= maxRetries && currentModelIndex < MODELS.length) {
    const currentModel = MODELS[currentModelIndex];
    
    try {
      const response = await client.chat.completions.create({
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
        model: currentModel,
        response_format: { type: 'json_object' },
        temperature: options.temperature ?? 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned empty response content.');
      }

      const parsedJson = cleanJsonResponse(content);
      const validatedData = schema.parse(parsedJson);
      return validatedData;
      
    } catch (err: any) {
      const status = err?.status || err?.statusCode || err?.response?.status;
      
      const isModelError = status === 404 || status === 400 || (err?.message && /model/i.test(err.message));
      const isRateLimitOrUnavailable = status === 429 || status === 503 || (err?.message && /rate limit|429|overloaded/i.test(err.message));

      console.warn(`[Groq LLM] Attempt ${attempt}/${maxRetries} failed with model ${currentModel}: ${err.message}`);

      if (isModelError) {
        // Model doesn't exist or is decommissioned for this key. Try the next model immediately.
        console.warn(`[Groq LLM] Model ${currentModel} invalid/missing. Cascading to next model...`);
        currentModelIndex++;
        if (currentModelIndex >= MODELS.length) {
          throw new Error(`Groq structured generation failed: All fallback models exhausted. Last error: ${err.message}`);
        }
        // Do not increment `attempt` because this is a model availability issue, not a transient failure
        continue;
      }

      if (attempt < maxRetries && isRateLimitOrUnavailable) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Groq LLM] Rate limited. Retrying in ${Math.round(backoffMs)}ms...`);
        await sleep(backoffMs);
        attempt++;
      } else {
        throw new Error(`Groq structured generation failed: ${err.message}`);
      }
    }
  }

  throw new Error(`Groq LLM failed after ${maxRetries} retries.`);
}
