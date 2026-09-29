import { describe, it, expect } from 'vitest';
import { cleanJsonResponse } from './llm.js';
import { validateUrl, sanitizeHtml } from './crawler.js';
import { checkCoverage } from './coverage.js';
import { Requirement, Question } from '../types/kit.js';

describe('Groq LLM Response Cleaning', () => {
  it('should clean raw JSON string with markdown fences', () => {
    const rawMarkdown = `\`\`\`json
{
  "title": "Software Engineer",
  "seniority": "Senior"
}
\`\`\``;

    const parsed = cleanJsonResponse(rawMarkdown);
    expect(parsed).toEqual({
      title: 'Software Engineer',
      seniority: 'Senior',
    });
  });

  it('should parse clean JSON without code fences', () => {
    const rawJson = '{"status": "ok", "count": 42}';
    const parsed = cleanJsonResponse(rawJson);
    expect(parsed).toEqual({ status: 'ok', count: 42 });
  });
});

describe('Web Crawler Utility', () => {
  it('should sanitize HTML by stripping scripts, styles, and extra whitespace', () => {
    const rawHtml = `
      <html>
        <head>
          <style>body { color: red; }</style>
          <script>console.log('secret');</script>
        </head>
        <body>
          <header><nav><a href="#">Navigation</a></nav></header>
          <h1>Company Engineering</h1>
          <p>We build   scalable   cloud microservices.</p>
        </body>
      </html>
    `;

    const cleaned = sanitizeHtml(rawHtml);
    expect(cleaned).not.toContain('color: red');
    expect(cleaned).not.toContain('console.log');
    expect(cleaned).toContain('Company Engineering');
    expect(cleaned).toContain('We build scalable cloud microservices.');
  });

  it('should validate URLs and allow local URLs when allowed', () => {
    const url = validateUrl('http://localhost:8099/hiring', true);
    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe('8099');
  });

  it('should block local URLs when allowLocal is false', () => {
    expect(() => validateUrl('http://127.0.0.1/admin', false)).toThrow(/blocked/i);
  });
});

describe('Second Pass Coverage Verification', () => {
  const reqs: Requirement[] = [
    { id: 'r1', text: 'Distributed Systems', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'TypeScript & Express', kind: 'technical', priority: 'must' },
  ];

  it('should identify when pass 2 is required due to uncovered must requirement', () => {
    const partialQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'system-design',
        prompt: 'Design rate limiter',
        answer_outline: 'Token bucket',
        difficulty: 3,
      },
    ];

    const initialCheck = checkCoverage(reqs, partialQuestions);
    expect(initialCheck.isComplete).toBe(false);
    expect(initialCheck.uncoveredMust.map((r) => r.id)).toEqual(['r2']);
  });
});
