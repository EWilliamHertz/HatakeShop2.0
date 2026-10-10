const fs = require('fs');
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

content = content.replace(
  /<th className="p-4 font-semibold">Status<\/th>/g,
  '<th className="p-4 font-semibold">Status</th>\n                <th className="p-4 font-semibold">B2C Sweden</th>'
);

content = content.replace(
  /(\s*<td className="p-4">\s*<span className=\{`px-2\.5 py-1 rounded-full.*?\}\s*>\s*\{p\.approvalStatus\}\s*<\/span>\s*<\/td>)/s,
  `$1\n                <td className="p-4">\n                  <label className="flex items-center space-x-2 cursor-pointer">\n                    <input \n                      type="checkbox" \n                      checked={p.isSverigeB2c || false} \n                      onChange={async (e) => {\n                        try {\n                          const token = await user?.getIdToken();\n                          await fetch(\`/api-v2/admin/products/\${p.id}/sverige\`, {\n                            method: 'PATCH',\n                            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },\n                            body: JSON.stringify({ isSverigeB2c: e.target.checked })\n                          });\n                          queryClient.invalidateQueries({ queryKey: ['admin-products'] });\n                        } catch(err) { console.error(err); }\n                      }}\n                      className="form-checkbox h-5 w-5 text-cyan-500 rounded border-slate-700 bg-slate-900 focus:ring-cyan-500 transition-colors"\n                    />\n                  </label>\n                </td>`
);


fs.writeFileSync('src/components/AdminListings.tsx', content);
