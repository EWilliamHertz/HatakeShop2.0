const fs = require('fs');
const file = 'src/pages/RFQDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<div className="font-bold text-xs opacity-75 mb-1">{msg.sender?.displayName || msg.senderName || 'User'}</div>`;
const replacement = `<div className="font-bold text-xs opacity-75 mb-1">
            {msg.sender ? \`\${msg.sender.displayName || 'User'} (\${msg.sender.companyName || 'Company'})\` : (msg.senderName || 'User')}
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
