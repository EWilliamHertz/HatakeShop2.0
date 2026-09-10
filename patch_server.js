const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const snippet = `
  app.post("/api/seller/:id/contact", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");

      const sellerId = parseInt(req.params.id, 10);
      const sellerQuery = await db.select().from(users).where(eq(users.id, sellerId));
      if (sellerQuery.length === 0) return res.status(404).send("Seller not found");
      const sellerProfile = sellerQuery[0];

      // Find or create "General Inquiry" product for this seller
      let product;
      const productQuery = await db.select().from(products).where(and(eq(products.sellerId, sellerId), eq(products.title, "General Inquiry")));
      if (productQuery.length > 0) {
        product = productQuery[0];
      } else {
        const result = await db.insert(products).values({
          sellerId: sellerId,
          title: "General Inquiry",
          description: "Direct message with the supplier",
          moq: 1,
          approvalStatus: 'Approved',
          originType: 'Direct Factory',
          leadTimeDays: 1,
          unitCost: "0"
        }).returning();
        product = result[0];
      }

      const result = await db.insert(inquiries).values({
        buyerId: userProfile.id,
        targetProductId: product.id,
        quantity: 1,
        status: 'Pending',
      }).returning();
      
      const newInquiry = result[0];

      // Setup Firestore inquiry & notification
      await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
        id: newInquiry.id,
        buyerId: userProfile.id,
        buyerName: userProfile.displayName,
        buyerCompany: userProfile.companyName,
        targetProductId: product.id,
        productTitle: product.title,
        sellerId: sellerId,
        sellerCompany: sellerProfile.companyName,
        status: newInquiry.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const msgData = {
        senderId: userProfile.id,
        text: "I would like to get in touch.",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await adminDb.collection('inquiries').doc(newInquiry.id.toString()).collection('messages').add(msgData);

      // Send Resend email
      try {
        await resend.emails.send({
          from: "Hatake <onboarding@resend.dev>",
          to: sellerProfile.email,
          subject: \`New Message from \${userProfile.companyName || userProfile.displayName}\`,
          html: \`<p>You have received a new message from \${userProfile.companyName || userProfile.displayName}.</p><p>Please log in to your dashboard to view and reply.</p>\`
        });
      } catch (emailErr) {
        console.error("Email failed:", emailErr);
      }

      res.json(newInquiry);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

`;
code = code.replace('  app.post("/api/inquiries", requireAuth, async (req: AuthRequest, res) => {', snippet + '  app.post("/api/inquiries", requireAuth, async (req: AuthRequest, res) => {');
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts");
