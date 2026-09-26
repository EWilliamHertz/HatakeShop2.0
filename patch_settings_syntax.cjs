const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const regex = /<pre className="text-sm font-mono leading-relaxed">[\s\S]*?<\/pre>/g;
const safePre = `
<pre className="text-sm font-mono leading-relaxed text-slate-300">
{\`import fetch from 'node-fetch';

// Initialize client connection to Hatake API
const syncInventory = async () => {
  try {
    const response = await fetch('https://api.hatake.shop/v2/inventory/sync', {
      headers: {
        'Authorization': 'Bearer hk_prod_9f8c2e1...',
        'Content-Type': 'application/json'
      }
    });

    const { data } = await response.json();
    console.log(\`Successfully synced \${data.length} products\`);
    
    // Push to Shopify/ERP...
    await shopifyClient.bulkUpdate(data);
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
};\`}
</pre>
`;

code = code.replace(regex, safePre.trim());

fs.writeFileSync('src/pages/Settings.tsx', code);
