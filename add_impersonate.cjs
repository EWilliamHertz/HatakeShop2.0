const fs = require('fs');
let code = fs.readFileSync('src/routes/admin.ts', 'utf8');

if (!code.includes('adminAuth')) {
  code = code.replace(/import \{ db \} from "\.\.\/db\/index\.js";/, 'import { db } from "../db/index.js";\nimport { adminAuth } from "../lib/firebase-admin.js";');
}

if (!code.includes('/impersonate/:uid')) {
  const route = `
// Impersonate a user
router.post(['/admin/impersonate/:uid', '/api/admin/impersonate/:uid', '/api-v2/admin/impersonate/:uid'], requireAdmin, async (req, res) => {
  try {
    const customToken = await adminAuth.createCustomToken(req.params.uid);
    res.json({ token: customToken });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;
  code = code.replace(/export default router;/, route + '\nexport default router;');
  fs.writeFileSync('src/routes/admin.ts', code);
  console.log('Impersonate route added');
}
