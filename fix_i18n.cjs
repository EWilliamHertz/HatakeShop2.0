const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');

const additionalZh = `
      "Business Contacts": "商业联系人",
      "Your Contacts": "您的联系人",
      "No contacts yet.": "暂无联系人。",
      "Start an RFQ to connect with suppliers.": "开始询价以联系供应商。",
`;
code = code.replace('"All Active RFQs": "所有有效询价",', '"All Active RFQs": "所有有效询价",' + additionalZh);
fs.writeFileSync('src/i18n.ts', code);
