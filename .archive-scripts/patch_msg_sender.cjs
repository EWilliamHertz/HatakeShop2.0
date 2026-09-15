const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `      const msgs = await db.query.inquiryMessages.findMany({
        where: eq(inquiryMessages.inquiryId, inquiryId),
        orderBy: [asc(inquiryMessages.createdAt)],
      });`;

const replacement = `      const msgs = await db.query.inquiryMessages.findMany({
        where: eq(inquiryMessages.inquiryId, inquiryId),
        orderBy: [asc(inquiryMessages.createdAt)],
        with: { sender: true }
      });`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
