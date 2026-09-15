const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove duplicate from get messages
code = code.replace(
  'const userProfile = await getUserProfile(req.user.uid);\n      if (!userProfile) return res.status(404).send("User missing");\n      \n      const userProfile = await getUserProfile(req.user.uid);\n      if (!userProfile) return res.status(404).send("User missing");',
  'const userProfile = await getUserProfile(req.user.uid);\n      if (!userProfile) return res.status(404).send("User missing");'
);

// Add to accept
code = code.replace(
  /app\.post\("\/api\/inquiries\/:id\/accept", requireAuth, async \(req: AuthRequest, res\) => \{\s*try \{\s*if \(!req\.user\) return res\.status\(401\)\.send\("Unauthorized"\);\s*const inquiryId = parseInt\(req\.params\.id, 10\);/,
  `app.post("/api/inquiries/:id/accept", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const inquiryId = parseInt(req.params.id, 10);
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");`
);

fs.writeFileSync('server.ts', code);
console.log("Fixed duplicate and added to accept");
