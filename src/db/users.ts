import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  const isAdmin = email === 'ewilliamhe@gmail.com' || email === 'ernst@hatake.eu' || email.toLowerCase() === 'phoebe@topbestpkg.com';
  const result = await db.insert(users)
    .values({
      uid,
      email,
      displayName,
      role: isAdmin ? 'admin' : 'buyer',
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName: displayName || undefined,
        role: isAdmin ? 'admin' : undefined,
      },
    })
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
