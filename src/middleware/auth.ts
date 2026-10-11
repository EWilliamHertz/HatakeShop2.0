import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

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
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Error verifying Firebase ID token, falling back to manual decode:', error);
    try {
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded && (decoded.uid || decoded.user_id)) {
          req.user = decoded as any;
          if (!req.user.uid) req.user.uid = decoded.user_id;
          return next();
        }
      }
    } catch(e) {
      console.warn("Manual decode failed:", e);
    }
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }
  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    try {
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (decoded && (decoded.uid || decoded.user_id)) {
          req.user = decoded as any;
          if (!req.user.uid) req.user.uid = decoded.user_id;
        }
      }
    } catch(e) {}
    return next();
  }
};
