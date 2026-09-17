import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  const isAdmin = email === 'ewilliamhe@gmail.com' || email === 'ernst@hatake.eu' || email.toLowerCase() === 'phoebe@topbestpkg.com';

  // First check by uid OR email to prevent duplicates
  const { or } = await import('drizzle-orm');
  const existing = await db.select().from(users).where(or(eq(users.uid, uid), eq(users.email, email))).limit(1);
  if (existing.length > 0) {
    const updated = await db.update(users).set({
      uid, // keep uid up to date in case it changed
      email,
      displayName: displayName || existing[0].displayName || undefined,
      role: isAdmin ? 'admin' : (existing[0].role || 'buyer'),
    }).where(eq(users.id, existing[0].id)).returning();
    return updated[0];
  }

  const result = await db.insert(users)
    .values({ uid, email, displayName, role: isAdmin ? 'admin' : 'buyer' })
    .returning();

  return result[0];
}

export async function getUserProfile(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch user profile", { cause: error });
  }
}

export async function updateUserProfile(uid: string, updates: any) {
  try {
    const result = await db.update(users).set(updates).where(eq(users.uid, uid)).returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to update user profile", { cause: error });
  }
}

import { notifications } from './schema.js';
export async function sendNotification(userId: number, title: string, message: string, link?: string) {
  await db.insert(notifications).values({ userId, title, message, link });
  // If Socket.IO was exported, we could io.to(userId).emit('notification', {...}) here.
}
