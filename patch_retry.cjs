const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const retryFunc = `
async function generateWithRetry(ai: any, params: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isTransient = err.status === 503 || err.status === 429 || (err.message && (err.message.includes('503') || err.message.includes('429')));
      if (isTransient && i < maxRetries - 1) {
        console.warn(\`AI model busy (attempt \${i + 1}/\${maxRetries}). Retrying in \${Math.pow(2, i)}s...\`);
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
}
`;

if (!code.includes('generateWithRetry(ai')) {
  // Insert the retryFunc after the first import block
  code = code.replace(
    'const app = express();',
    retryFunc + '\nconst app = express();'
  );
  
  // Replace calls
  code = code.replace(
    /await ai\.models\.generateContent\(\{/g,
    'await generateWithRetry(ai, {'
  );
  
  fs.writeFileSync('server.ts', code);
}
