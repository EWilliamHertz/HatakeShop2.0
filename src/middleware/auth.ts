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
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
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
