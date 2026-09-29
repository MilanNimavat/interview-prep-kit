import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  findKitsByUserId,
  findKitById,
  saveKit,
  updateKit,
  deleteKit,
} from '../services/db.js';
import { executePipeline, generateCompanyBrief, generateQuestions } from '../services/pipeline.js';
import { crawlCompanyWebsite } from '../services/crawler.js';
import { buildSchedule } from '../services/scheduler.js';
import { buildCoverageObject } from '../services/coverage.js';
import { KitSchema, Question } from '../types/kit.js';

const router = Router();

// Protect all kit routes
router.use(requireAuth);

const CreateKitSchema = z.object({
  jd: z.string().min(10, 'Job description is too short. Please paste at least a few sentences.'),
  company_url: z.string().url('Please provide a valid company URL (e.g., https://company.com).'),
  days: z.number().int().min(1, 'Days available must be at least 1').max(60, 'Days available max is 60'),
});

const BatchCreateKitSchema = z.object({
  cases: z.array(CreateKitSchema).min(1, 'At least 1 case is required'),
});

// POST /api/kits - Create single kit
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = CreateKitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { jd, company_url, days } = parseResult.data;
    const userId = req.user!.userId;

    const kitData = await executePipeline({
      jd,
      companyUrl: company_url,
      daysAvailable: days,
      allowLocalUrls: true,
    });

    const record = await saveKit(userId, kitData);
    return res.status(201).json({ kit: record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate kit' });
  }
});

// POST /api/kits/batch - Create batch kits for multi-role prep
router.post('/batch', async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = BatchCreateKitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { cases } = parseResult.data;
    const userId = req.user!.userId;
    const savedKits = [];

    for (const item of cases) {
      const kitData = await executePipeline({
        jd: item.jd,
        companyUrl: item.company_url,
        daysAvailable: item.days,
        allowLocalUrls: true,
      });

      const record = await saveKit(userId, kitData);
      savedKits.push(record);
    }

    return res.status(201).json({ kits: savedKits });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process batch kits' });
  }
});

// GET /api/kits - List user's kits
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const kits = await findKitsByUserId(userId);
    return res.json({ kits });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list kits' });
  }
});

// GET /api/kits/:id - Get specific kit
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const record = await findKitById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    if (record.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this kit.' });
    }

    return res.json({ kit: record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch kit' });
  }
});

// PUT /api/kits/:id - Update kit (for inline edits, question reordering, pin/edit state updates)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const existingRecord = await findKitById(req.params.id);

    if (!existingRecord) {
      return res.status(404).json({ error: 'Kit not found' });
    }

    if (existingRecord.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this kit.' });
    }

    const { kitData } = req.body;
    if (!kitData) {
      return res.status(400).json({ error: 'Missing kitData payload' });
    }

    // Recalculate schedule and coverage deterministically to maintain consistency
    const updatedCoverage = buildCoverageObject(kitData.role.requirements, kitData.questions);
    const updatedSchedule = buildSchedule(
      kitData.role.requirements,
      kitData.questions,
      kitData.schedule.days_available
    );

    const fullUpdatedData = {
      ...kitData,
      coverage: updatedCoverage,
      schedule: updatedSchedule,
    };

    const validatedKit = KitSchema.parse(fullUpdatedData);
    const updatedRecord = await updateKit(req.params.id, userId, validatedKit);

    return res.json({ kit: updatedRecord });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid kit update payload' });
  }
});

// DELETE /api/kits/:id - Delete kit
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deleted = await deleteKit(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Kit not found or unauthorized' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete kit' });
  }
});

const RegenerateSectionSchema = z.object({
  section: z.enum(['company_brief', 'schedule', 'category']),
  categoryName: z.string().optional(),
});

// POST /api/kits/:id/regenerate-section
// CRITICAL SYSTEM REQUIREMENT: Section regeneration MUST NOT discard user edits/pinned items elsewhere.
router.post('/:id/regenerate-section', async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = RegenerateSectionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { section, categoryName } = parseResult.data;
    const userId = req.user!.userId;
    const record = await findKitById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    if (record.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this kit.' });
    }

    const kitData = { ...record.kitData };

    if (section === 'company_brief') {
      const crawledData = await crawlCompanyWebsite(kitData.source.company_url, { allowLocal: true });
      const newBrief = await generateCompanyBrief(
        crawledData,
        kitData.source.company,
        kitData.source.company_url
      );
      kitData.company_brief = newBrief;
    } else if (section === 'schedule') {
      kitData.schedule = buildSchedule(
        kitData.role.requirements,
        kitData.questions,
        kitData.schedule.days_available
      );
    } else if (section === 'category') {
      if (!categoryName) {
        return res.status(400).json({ error: 'categoryName is required when section is category' });
      }

      // Filter existing questions for categoryName
      const otherCategoryQuestions: Question[] = [];
      const categoryKeptQuestions: Question[] = [];

      for (const q of kitData.questions) {
        if (q.category === categoryName) {
          // Keep questions marked 'edited' or 'pinned'
          if (q.user_state === 'edited' || q.user_state === 'pinned') {
            categoryKeptQuestions.push(q);
          }
        } else {
          otherCategoryQuestions.push(q);
        }
      }

      // Generate new questions for the role
      let newQuestions = await generateQuestions(kitData.role);
      // Filter for categoryName
      newQuestions = newQuestions.filter((q) => q.category === categoryName);

      // Re-index new questions to ensure unique IDs
      const maxExistingId = kitData.questions.length;
      const reindexedNew = newQuestions.map((q, idx) => ({
        ...q,
        id: `q${maxExistingId + idx + 1}`,
        user_state: 'generated' as const,
      }));

      // Combine: other categories + kept (edited/pinned) + newly generated
      kitData.questions = [
        ...otherCategoryQuestions,
        ...categoryKeptQuestions,
        ...reindexedNew,
      ];

      // Recalculate coverage and schedule deterministically
      kitData.coverage = buildCoverageObject(kitData.role.requirements, kitData.questions);
      kitData.schedule = buildSchedule(
        kitData.role.requirements,
        kitData.questions,
        kitData.schedule.days_available
      );
    }

    const validatedKit = KitSchema.parse(kitData);
    const updatedRecord = await updateKit(req.params.id, userId, validatedKit);

    return res.json({ kit: updatedRecord });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to regenerate section' });
  }
});

export default router;
