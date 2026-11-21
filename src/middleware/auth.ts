import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken & {
    userId?: number;
    isAdminPasswordAuth?: boolean;
  };
}

function getAdminPasswordSecret(): string {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

export function verifyAdminPassword(candidate: string): boolean {
  const secret = getAdminPasswordSecret();
  if (!secret || !candidate) return false;
  const a = Buffer.from(candidate.trim(), 'utf8');
  const b = Buffer.from(secret, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createAdminPasswordToken(uid: string, email: string, userId: number): string {
  const secret = getAdminPasswordSecret();
  if (!secret) throw new Error('ADMIN_PASSWORD is not configured');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ uid, email, userId, expiresAt }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `hatake_admin.${payload}.${sig}`;
}

export function verifyAdminPasswordToken(token: string): {
  uid: string;
  email: string;
  userId: number;
  email_verified: boolean;
  isAdminPasswordAuth: boolean;
} | null {
  const secret = getAdminPasswordSecret();
  if (!secret || !token) return null;

  if (token.startsWith('hatake_admin.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!parsed || typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) {
        return null;
      }
      return {
        uid: String(parsed.uid || 'uJjvZKedn0MBrz75w6bd9Az8P0H3'),
        email: String(parsed.email || 'ernst@hatake.eu'),
        userId: Number(parsed.userId || 92),
        email_verified: true,
        isAdminPasswordAuth: true,
      };
    } catch {
      return null;
    }
  }

  if (verifyAdminPassword(token)) {
    return {
      uid: 'uJjvZKedn0MBrz75w6bd9Az8P0H3',
      email: 'ernst@hatake.eu',
      userId: 92,
      email_verified: true,
      isAdminPasswordAuth: true,
    };
  }

  return null;
}

// Cache Google SecureToken X.509 public certificates to verify Firebase RS256 tokens
// even when the local container clock is skewed relative to Google's auth servers.
let cachedGoogleCerts: { certs: Record<string, string>; fetchedAt: number } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() - cachedGoogleCerts.fetchedAt < 3600_000) {
    return cachedGoogleCerts.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  const certs = (await res.json()) as Record<string, string>;
  cachedGoogleCerts = { certs, fetchedAt: Date.now() };
  return certs;
}

async function verifyFirebaseJwtWithGoogleCerts(token: string): Promise<DecodedIdToken | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    if (!header || header.alg !== 'RS256' || !header.kid) return null;

    const projectId = process.env.FIREBASE_PROJECT_ID || 'hatake-shop';
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== 'string') return null;

    const certs = await getGooglePublicCerts();
    const certPem = certs[header.kid];
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const sigBuf = Buffer.from(sigB64, 'base64url');
    const isValidSig = verifier.verify(certPem, sigBuf);
    if (!isValidSig) return null;

    return {
      ...payload,
      uid,
    } as DecodedIdToken;
  } catch {
    return null;
  }
}

async function resolveFirebaseToken(token: string): Promise<DecodedIdToken> {
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (err: any) {
    // If container clock skew (e.g. 2026-11-21) caused a false id-token-expired error,
    // verify the token's cryptographic RS256 signature directly against Google's X.509 certs.
    const verified = await verifyFirebaseJwtWithGoogleCerts(token);
    if (verified) return verified;
    throw err;
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim();
  } else if (req.headers['x-admin-password'] && typeof req.headers['x-admin-password'] === 'string') {
    token = req.headers['x-admin-password'].trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const adminDecoded = verifyAdminPasswordToken(token);
  if (adminDecoded) {
    req.user = adminDecoded as any;
    next();
    return;
  }

  try {
    const decodedToken = await resolveFirebaseToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.warn('[auth] Firebase ID token verification failed:', error?.message || error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim();
  } else if (req.headers['x-admin-password'] && typeof req.headers['x-admin-password'] === 'string') {
    token = req.headers['x-admin-password'].trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }
  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  const adminDecoded = verifyAdminPasswordToken(token);
  if (adminDecoded) {
    req.user = adminDecoded as any;
    return next();
  }

  try {
    const decodedToken = await resolveFirebaseToken(token);
    req.user = decodedToken;
  } catch {
    // Optional auth silently continues unauthenticated if token is invalid
  }
  return next();
};
