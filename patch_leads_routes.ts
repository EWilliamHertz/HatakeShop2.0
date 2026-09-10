import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const target = `  app.post("/api/admin/marketing", requireAuth, async (req: AuthRequest, res) => {`;

const replacement = `  app.post("/api/admin/leads/import", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).send("Forbidden");
      
      const { leads: importedLeads } = req.body;
      if (!importedLeads || !Array.isArray(importedLeads)) return res.status(400).json({ error: "Invalid leads data" });
      
      const validLeads = importedLeads
        .filter(l => l['Email 1'] || l['Email 2'])
        .map(l => {
           const email = l['Email 1'] || l['Email 2'];
           let location = "";
           if (l['City'] && l['State']) {
              location = \`\${l['City']}, \${l['State']}\`;
           }
           const socialLinks = [];
           if (l['Facebook']) socialLinks.push({ platform: 'facebook', url: l['Facebook'] });
           if (l['Instagram']) socialLinks.push({ platform: 'instagram', url: l['Instagram'] });
           if (l['Twitter']) socialLinks.push({ platform: 'twitter', url: l['Twitter'] });
           
           return {
             email: email,
             companyName: l['Business Name'],
             website: l['Website'] || null,
             location,
             socialLinks,
             status: 'pending'
           };
        });
        
      if (validLeads.length > 0) {
         for (const lead of validLeads) {
            try {
               await db.insert(leads).values(lead).onConflictDoNothing();
            } catch (err) {
               console.error("Error inserting lead:", err);
            }
         }
      }
      
      res.json({ success: true, count: validLeads.length });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/leads/send", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).send("Forbidden");
      const { limit = 100 } = req.body;
      
      const pendingLeads = await db.select().from(leads).where(eq(leads.status, 'pending')).limit(limit);
      if (pendingLeads.length === 0) return res.json({ success: true, sent: 0 });
      
      let sentCount = 0;
      for (const lead of pendingLeads) {
         const token = crypto.randomUUID();
         const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
         
         const registrationUrl = \`https://hatake.shop/login?invite=\${token}\`;
         const unsubscribeUrl = \`https://hatake.shop/unsubscribe?email=\${encodeURIComponent(lead.email)}\`;
         
         const companyNameStr = lead.companyName || "Partner";
         const firstName = companyNameStr.split(' ')[0] || "Partner";
         
         const html = \`
           <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
             <h2 style="color: #4f46e5;">Buy and sell TCG in wholesale — worldwide</h2>
             <p>You're invited to join Hatake.Shop B2B, the global marketplace built for trading card game professionals.</p>
             <p>Hi \${firstName},</p>
             <p>We'd like to welcome <strong>\${companyNameStr}</strong> to Hatake.Shop B2B — the wholesale platform where retailers, distributors, and stores source and move TCG inventory at scale, across borders, with confidence.</p>
             
             <h3>What you can do on Hatake.Shop B2B</h3>
             <ul>
               <li><strong>Buy wholesale:</strong> Access sealed product, singles, and accessories from verified sellers around the world.</li>
               <li><strong>Sell wholesale:</strong> List your inventory once and reach thousands of qualified B2B buyers globally.</li>
               <li><strong>Trade with confidence:</strong> Vetted partners, transparent pricing, and secure payments in multiple currencies.</li>
               <li><strong>Ship globally:</strong> Integrated logistics tools to move product across regions without the usual friction.</li>
             </ul>
             
             <div style="text-align: center; margin: 30px 0;">
               <a href="\${registrationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate your B2B account</a>
             </div>
             
             <p style="font-size: 14px;">Onboarding takes minutes. A dedicated partner manager will help you get set up.</p>
             
             <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
             
             <h3>Why partners choose Hatake.Shop</h3>
             <ul style="padding-left: 20px;">
               <li><strong>Global reach:</strong> Buyers and sellers across Europe, North America, and Asia — all in one marketplace.</li>
               <li><strong>Better margins:</strong> Cut out the middlemen and trade directly with verified wholesale partners.</li>
               <li><strong>Real-time inventory:</strong> Live stock levels and pricing so you always know what's available.</li>
               <li><strong>Secure transactions:</strong> Escrow-backed payments and buyer/seller protection on every order.</li>
             </ul>
             
             <p>Questions before you sign up? Just reply to this email and our team will get back to you within one business day.</p>
             <p>Looking forward to trading with you,<br/>The Hatake.Shop B2B Team</p>
             
             <div style="margin-top: 40px; font-size: 12px; color: #888; text-align: center;">
               <p>If you no longer wish to receive these emails, you can <a href="\${unsubscribeUrl}" style="color: #888; text-decoration: underline;">unsubscribe here</a>.</p>
               <p>Hatake.Shop B2B • <a href="https://hatake.shop" style="color: #888;">hatake.shop</a><br/>© 2026 Hatake.Shop. All rights reserved.</p>
             </div>
           </div>
         \`;

         try {
            await resend.emails.send({
              from: "Hatake <hello@hatake.shop>",
              to: lead.email,
              subject: \`\${companyNameStr}, join Hatake.Shop B2B\`,
              html: html,
            });
            
            await db.update(leads)
              .set({ status: 'sent', inviteTokenHash: tokenHash, sentAt: new Date() })
              .where(eq(leads.id, lead.id));
              
            sentCount++;
         } catch (err: any) {
            console.error("Failed to send email to", lead.email, err);
         }
      }
      
      res.json({ success: true, sent: sentCount });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/marketing", requireAuth, async (req: AuthRequest, res) => {`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
