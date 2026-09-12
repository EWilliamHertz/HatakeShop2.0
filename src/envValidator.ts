export function validateEnv() {
  const warnings: string[] = [];
  
  if (!process.env.DATABASE_URL) warnings.push('DATABASE_URL is missing. Database connection will fail.');
  if (!process.env.GEMINI_API_KEY) warnings.push('GEMINI_API_KEY is missing. AI embeddings will be skipped.');
  if (!process.env.STRIPE_SECRET_KEY) warnings.push('STRIPE_SECRET_KEY is missing. Payment webhooks will not work.');
  if (!process.env.RESEND_API_KEY) warnings.push('RESEND_API_KEY is missing. Email dispatch will fail.');
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    warnings.push('FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY are missing. Firestore-backed features (notifications, RFQ mirrors) will fail with "Could not load the default credentials".');
  }
  
  if (warnings.length > 0) {
    console.warn('\n--- ENVIRONMENT WARNINGS ---');
    warnings.forEach(w => console.warn(`⚠️  ${w}`));
    console.warn('----------------------------\n');
  } else {
    console.log('✅ Environment variables validated.');
  }
}
