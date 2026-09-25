import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Dev/test token bypasses are ONLY active when ALLOW_TEST_TOKENS=1.
 * This must never be set in production (Vercel env vars / local .env).
 * The auth router also refuses to mint custom tokens when the flag is off,
 * so the two ends can never drift apart.
 */
export const ALLOW_TEST_TOKENS =
  process.env.ALLOW_TEST_TOKENS === '1' && process.env.NODE_ENV !== 'production';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  if (ALLOW_TEST_TOKENS) {
    if (token === 'mock-admin-token') {
      req.user = { uid: 'mock-admin-uid', email: 'ernst@hatake.eu', name: 'Ernst (Admin)' } as any;
      return next();
    }

    if (token.startsWith('custom-token-')) {
      const uid = token.split('custom-token-')[1];
      req.user = { uid, email: '', name: 'Custom User' } as any;
      return next();
    }
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
