const fs = require('fs');
let content = fs.readFileSync('src/routes/products.ts', 'utf-8');

const oldStripeSession = `    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: validatedItems.map(item => ({`;

const newStripeSession = `    // Fetch seller stripe account
    const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId, stripeOnboardingComplete: users.stripeOnboardingComplete }).from(users).where(eq(users.id, sellerId as number)).limit(1);
    if (!sellerInfo.length || !sellerInfo[0].stripeAccountId || !sellerInfo[0].stripeOnboardingComplete) {
        return res.status(400).json({ error: "The seller is not fully onboarded with Stripe to receive payments yet." });
    }

    const platformFeeCents = Math.round((totalAmount * 100) * 0.045); // 4.5% platform fee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: sellerInfo[0].stripeAccountId,
        },
      },
      line_items: validatedItems.map(item => ({`;

content = content.replace(oldStripeSession, newStripeSession);
fs.writeFileSync('src/routes/products.ts', content);
