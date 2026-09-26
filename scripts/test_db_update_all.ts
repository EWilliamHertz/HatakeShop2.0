import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const result = await db.update(users).set({
        companyName: '',
        orgNumber: '',
        website: '',
        aboutUs: '',
        socialLinks: [],
        portfolio: [],
        profilePictureUrl: '',
        bannerUrl: '',
        country: '',
        vatNumber: '',
        role: 'buyer',
        autoTranslate: false,
        preferredLanguage: 'English',
        teamRole: 'owner',
        shippingAddress: '',
        shippingCity: '',
        shippingZip: '',
        stripeAccountId: '',
        kybDocuments: [],
        verificationStatus: 'verified'
    }).where(eq(users.uid, 'fmzfhao4oZgkMWuQBISnGvIqEqY2')).returning();
    console.log("Success:", result.length);
  } catch(e) {
    console.error("DB Error:", e);
  }
  process.exit(0);
}
run();
