import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { initDatabase } from '../services/db.js';

describe('Express API Server Endpoints', () => {
  let authToken = '';
  let createdKitId = '';

  beforeAll(async () => {
    await initDatabase();
  });

  it('GET /health - should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('mongoConnected');
  });

  it('POST /api/auth/register - should create a new user and return token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'engineer@apex.io',
      password: 'password123',
      name: 'Alex Engineer',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('engineer@apex.io');
    authToken = res.body.token;
  });

  it('POST /api/auth/login - should authenticate existing user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'engineer@apex.io',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('GET /api/auth/me - should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('engineer@apex.io');
  });

  it('POST /api/kits - should generate and save a kit', async () => {
    const res = await request(app)
      .post('/api/kits')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        jd: 'Senior Full Stack Engineer at Apex. Required: Node.js, Express, TypeScript, Next.js 14, System Design.',
        company_url: 'https://apex.io',
        days: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.kit).toHaveProperty('id');
    expect(res.body.kit.kitData.source.company).toBe('Apex');
    createdKitId = res.body.kit.id;
  });

  it('GET /api/kits - should list user kits', async () => {
    const res = await request(app)
      .get('/api/kits')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.kits)).toBe(true);
    expect(res.body.kits.length).toBeGreaterThan(0);
  });

  it('GET /api/kits/:id - should return kit by id', async () => {
    const res = await request(app)
      .get(`/api/kits/${createdKitId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kit.id).toBe(createdKitId);
  });

  it('POST /api/kits/:id/regenerate-section - state machine preserves pinned/edited questions', async () => {
    // 1. Fetch current kit
    const getRes = await request(app)
      .get(`/api/kits/${createdKitId}`)
      .set('Authorization', `Bearer ${authToken}`);
    const kit = getRes.body.kit;

    // 2. Mark first question as 'pinned'
    kit.kitData.questions[0].user_state = 'pinned';
    kit.kitData.questions[0].prompt = 'PINNED: Custom prompt title';

    // 3. Save update
    await request(app)
      .put(`/api/kits/${createdKitId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ kitData: kit.kitData });

    // 4. Regenerate section category
    const targetCategory = kit.kitData.questions[0].category;
    const regenRes = await request(app)
      .post(`/api/kits/${createdKitId}/regenerate-section`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        section: 'category',
        categoryName: targetCategory,
      });

    expect(regenRes.status).toBe(200);
    const updatedQuestions = regenRes.body.kit.kitData.questions;

    // Verify pinned question was preserved!
    const pinnedQuestion = updatedQuestions.find((q: any) => q.prompt === 'PINNED: Custom prompt title');
    expect(pinnedQuestion).toBeDefined();
    expect(pinnedQuestion.user_state).toBe('pinned');
  });

  it('POST /api/kits/:id/evaluate-answer - AI Mock Interview Evaluator', async () => {
    const getRes = await request(app)
      .get(`/api/kits/${createdKitId}`)
      .set('Authorization', `Bearer ${authToken}`);
    const questionId = getRes.body.kit.kitData.questions[0].id;

    const evalRes = await request(app)
      .post(`/api/kits/${createdKitId}/evaluate-answer`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionId,
        userAnswer:
          'I use token bucket algorithms backed by Redis for distributed rate limiting. We maintain atomic counters and apply exponential backoff when rate limits are exceeded.',
      });

    expect(evalRes.status).toBe(200);
    expect(evalRes.body).toHaveProperty('evaluation');
    expect(evalRes.body.evaluation).toHaveProperty('score');
    expect(typeof evalRes.body.evaluation.score).toBe('number');
    expect(Array.isArray(evalRes.body.evaluation.strengths)).toBe(true);
    expect(Array.isArray(evalRes.body.evaluation.missing_key_points)).toBe(true);
    expect(typeof evalRes.body.evaluation.suggested_refinement).toBe('string');
    expect(typeof evalRes.body.evaluation.ready_for_interview).toBe('boolean');
  });
});
