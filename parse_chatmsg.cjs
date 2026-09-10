const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');
const match = code.match(/function ChatMessage.*?return \(.*?\n\}\n/s);
if (match) {
   console.log(match[0]);
} else {
   console.log("Not found");
}
