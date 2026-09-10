const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find the line numbers to delete
const lines = code.split('\n');
let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('io.to(`user_${recipientUid}`).emit("inquiry_updated");')) {
    start = i - 1; // From the closing brace of if (io) { ... }
  }
  if (start !== -1 && lines[i].includes('app.post("/api/inquiries/:id/accept-quote"')) {
    end = i - 2; // Before the new endpoint starts
    break;
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1);
  fs.writeFileSync('server.ts', lines.join('\n'));
  console.log("Fixed syntax error by removing leftover code");
} else {
  console.log("Could not find boundaries", start, end);
}
