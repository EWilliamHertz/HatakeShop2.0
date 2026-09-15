const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const inquiryId = parseInt(req.params.id, 10);',
  'const inquiryId = parseInt(req.params.id, 10);\n      const userProfile = await getUserProfile(req.user.uid);\n      if (!userProfile) return res.status(404).send("User missing");'
);

fs.writeFileSync('server.ts', code);
console.log("Fixed accept endpoint userProfile");
