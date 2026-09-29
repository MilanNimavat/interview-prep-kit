import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import kitsRoutes from './routes/kits.js';
import practiceRoutes from './routes/practice.js';
import { getIsMongoConnected } from './services/db.js';

dotenv.config();

const app = express();

// Enable CORS for frontend integration
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-user-id', 'Accept', 'Origin']
  })
);

// Middleware for parsing JSON & URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongoConnected: getIsMongoConnected(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitsRoutes);
app.use('/api/kits', practiceRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Express Global Error]', err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
