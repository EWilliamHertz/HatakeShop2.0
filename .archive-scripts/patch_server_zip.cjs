const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
if (!code.includes('/download-zip')) {
  code = code.replace("app.use('/api-v2',", "app.get('/download-zip', (req, res) => res.download('./hatake-shop-full.zip'));\napp.use('/api-v2',");
  fs.writeFileSync('server.ts', code);
}
