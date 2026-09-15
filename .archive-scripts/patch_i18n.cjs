const fs = require('fs');

let content = fs.readFileSync('src/i18n.ts', 'utf8');

const additionsEN = `
      "Cold Email Outreach Progress": "Cold Email Outreach Progress",
      "Search products...": "Search products...",
      "Search": "Search",
      "Settings": "Settings",
      "Sponsored Products": "Sponsored Products",
      "© 2026 Hatake.Shop. All rights reserved.": "© 2026 Hatake.Shop. All rights reserved.",
`;

const additionsZH = `
      "Cold Email Outreach Progress": "冷邮件推广进度",
      "Search products...": "搜索产品...",
      "Search": "搜索",
      "Settings": "设置",
      "Sponsored Products": "赞助产品",
      "© 2026 Hatake.Shop. All rights reserved.": "© 2026 Hatake.Shop. 保留所有权利。",
`;

const additionsSV = `
      "Cold Email Outreach Progress": "Framsteg för kalla e-postmeddelanden",
      "Search products...": "Sök efter produkter...",
      "Search": "Sök",
      "Settings": "Inställningar",
      "Sponsored Products": "Sponsrade Produkter",
      "© 2026 Hatake.Shop. All rights reserved.": "© 2026 Hatake.Shop. Alla rättigheter förbehållna.",
`;

content = content.replace(/"Cold Email Outreach Progress \(TCG Vendors\)": "Cold Email Outreach Progress \(TCG Vendors\)",/, '"Cold Email Outreach Progress (TCG Vendors)": "Cold Email Outreach Progress (TCG Vendors)",' + additionsEN);
content = content.replace(/"Cold Email Outreach Progress \(TCG Vendors\)": "冷邮件推广进度（TCG 供应商）",/, '"Cold Email Outreach Progress (TCG Vendors)": "冷邮件推广进度（TCG 供应商）",' + additionsZH);
content = content.replace(/"Cold Email Outreach Progress \(TCG Vendors\)": "Framsteg för kalla e-postmeddelanden \(TCG-leverantörer\)",/, '"Cold Email Outreach Progress (TCG Vendors)": "Framsteg för kalla e-postmeddelanden (TCG-leverantörer)",' + additionsSV);

fs.writeFileSync('src/i18n.ts', content);
console.log("i18n patched");
