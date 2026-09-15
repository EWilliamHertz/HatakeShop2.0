const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `const conversionRate = totalInquiriesCount > 0 ? (acceptedOrPaidCount / totalInquiriesCount) * 100 : 0;`;
const replacement = `const conversionRate = totalInquiriesCount > 0 ? (acceptedOrPaidCount / totalInquiriesCount) * 100 : 0;
      
      let negotiatingCount = 0;
      myInquiries.forEach(inq => {
         if (inq.status === 'Open') negotiatingCount++;
      });
      
      const funnelData = [
         { name: 'Initiated', value: totalInquiriesCount, fill: '#6366f1' },
         { name: 'Negotiating', value: negotiatingCount, fill: '#f59e0b' },
         { name: 'Accepted', value: acceptedOrPaidCount, fill: '#10b981' }
      ];`;

content = content.replace(target, replacement);

const target2 = `res.json({
         totalRevenue,
         profileViews: w1 + w2 + w3 + w4 + 10,
         conversionRate,
         lineChartData,
         barChartData
      });`;
const replacement2 = `res.json({
         totalRevenue,
         profileViews: w1 + w2 + w3 + w4 + 10,
         conversionRate,
         lineChartData,
         barChartData,
         funnelData
      });`;
content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
