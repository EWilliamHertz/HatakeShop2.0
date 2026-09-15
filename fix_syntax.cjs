const fs = require('fs');

// Fix rfqs.ts
let rfq = fs.readFileSync('src/routes/rfqs.ts', 'utf-8');
rfq = rfq.replace('async function startLocalServer() {', '');
fs.writeFileSync('src/routes/rfqs.ts', rfq);

// Fix server.ts
let srv = fs.readFileSync('server.ts', 'utf-8');
srv = srv.replace(
  '  if (process.env.NODE_ENV !== "production") {',
  'async function startLocalServer() {\n  if (process.env.NODE_ENV !== "production") {'
);
fs.writeFileSync('server.ts', srv);

console.log("Syntax fixed");
