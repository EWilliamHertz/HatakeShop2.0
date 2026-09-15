const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');

const newTranslations = `
      "Describe what you are looking for in plain language, and our Gemini-powered engine will instantly find the best verified suppliers, break down logistics, and match origin requirements.": "用通俗易懂的语言描述您的需求，我们的 Gemini 驱动引擎将立即找到最佳的经过验证的供应商，细分物流选项，并匹配产地要求。",
      "Run AI Sourcing Analysis": "运行 AI 采购分析",
`;
code = code.replace('"Universal AI Sourcing Engine": "通用 AI 采购引擎",', '"Universal AI Sourcing Engine": "通用 AI 采购引擎",' + newTranslations);
fs.writeFileSync('src/i18n.ts', code);
