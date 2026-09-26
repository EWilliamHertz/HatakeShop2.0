const fs = require('fs');
let code = fs.readFileSync('src/routes/products.ts', 'utf8');
code = code.replace('const limit = 12;', 'const limit = parseInt(req.query.limit as string) || 12; if (limit > 200) return res.status(400).json({error: "Limit too high"});');
fs.writeFileSync('src/routes/products.ts', code);
