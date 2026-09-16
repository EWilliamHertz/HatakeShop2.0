const fs = require('fs');
let code = fs.readFileSync('src/routes/admin.ts', 'utf8');

const correctRoute = `
// Impersonate a user
router.post(['/admin/impersonate/:id', '/api/admin/impersonate/:id', '/api-v2/admin/impersonate/:id'], requireAdmin, async (req, res) => {
  try {
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const targetUser = await db.select().from(users).where(eq(users.id, parseInt(req.params.id))).limit(1);
    
    if (!targetUser.length) return res.status(404).json({ error: 'User not found' });
    
    const customToken = await adminAuth.createCustomToken(targetUser[0].uid);
    res.json({ token: customToken });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace(/\/\/ Impersonate a user[\s\S]*?\}\);/, correctRoute.trim());
fs.writeFileSync('src/routes/admin.ts', code);
console.log('Impersonate route fixed');
