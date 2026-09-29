import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'apex_super_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

export function generateToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
  }

  if (!token) {
    // Check if guest dev header exists
    const guestId = req.headers['x-guest-user-id'] as string;
    if (guestId) {
      req.user = { userId: guestId, email: 'guest@apex.local', name: 'Guest User' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}
