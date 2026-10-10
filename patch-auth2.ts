import fs from 'fs';
let content = fs.readFileSync('src/middleware/auth.ts', 'utf8');

content = content.replace(/import jwt from 'jsonwebtoken';\n/, '');

content = content.replace(
  /try \{\n\s*const decoded = jwt\.decode\(token\);\n\s*if \(decoded && decoded\.uid\) \{\n\s*req\.user = decoded as any;\n\s*return next\(\);\n\s*\}\n\s*\} catch\(e\) \{\}/,
  `try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      if (decoded && (decoded.uid || decoded.user_id)) {
        req.user = decoded as any;
        if (!req.user.uid) req.user.uid = decoded.user_id;
        return next();
      }
    } catch(e) {}`
);

fs.writeFileSync('src/middleware/auth.ts', content);
