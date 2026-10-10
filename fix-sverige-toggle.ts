import fs from 'fs';
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

const customToggle = `
function SverigeToggle({ product, user, queryClient }: { product: any, user: any, queryClient: any }) {
  const [checked, setChecked] = React.useState(product.isSverigeB2c || false);
  const [loading, setLoading] = React.useState(false);
  
  React.useEffect(() => { setChecked(product.isSverigeB2c || false) }, [product.isSverigeB2c]);

  return (
    <input 
      type="checkbox" 
      checked={checked} 
      disabled={loading}
      onChange={async (e) => {
        const newVal = e.target.checked;
        setChecked(newVal);
        setLoading(true);
        try {
          const token = await user?.getIdToken();
          await fetch(\`/api-v2/admin/products/\${product.id}/sverige\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ isSverigeB2c: newVal })
          });
          queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        } catch(err) { 
          console.error(err); 
          setChecked(!newVal); // revert
        } finally {
          setLoading(false);
        }
      }}
      className="form-checkbox h-5 w-5 text-cyan-500 rounded border-slate-700 bg-slate-900 focus:ring-cyan-500 transition-colors"
    />
  );
}
`;

if (!content.includes('function SverigeToggle')) {
  content = content.replace(
    /import React, \{ useState \} from 'react';/,
    `import React, { useState } from 'react';\n${customToggle}`
  );
}

fs.writeFileSync('src/components/AdminListings.tsx', content);
