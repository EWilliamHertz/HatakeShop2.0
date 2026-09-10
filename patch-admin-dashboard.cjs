const fs = require('fs');
let adminTs = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const pendingSellersUI = `
                <h3 className="text-2xl font-bold text-white mt-12">Pending Seller Applications</h3>
                {!approvals.pendingSellers || approvals.pendingSellers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No pending seller applications.</div>
                ) : approvals.pendingSellers.map((u: any) => (
                  <div key={u.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex justify-between items-center mb-4">
                    <div>
                      <div className="font-semibold text-white mb-1">{u.companyName || u.displayName || u.email}</div>
                      <div className="text-xs text-slate-400">
                        Email: <span className="text-slate-300">{u.email}</span> | 
                        VAT: <span className="text-slate-300">{u.vatNumber || 'N/A'}</span>
                      </div>
                      {u.kybDocuments && u.kybDocuments.length > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="text-slate-400">Documents: </span>
                          {u.kybDocuments.map((doc: any, i: number) => (
                            <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline mr-2">{doc.name || 'Document'}</a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprovalAction('seller', u.id, 'approve')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm transition-colors">Approve</button>
                      <button onClick={() => handleApprovalAction('seller', u.id, 'reject')} className="px-4 py-2 bg-slate-700 hover:bg-rose-600 text-white font-semibold rounded-lg text-sm transition-colors">Reject</button>
                    </div>
                  </div>
                ))}
`;

// Insert after pendingUsers
adminTs = adminTs.replace(/<\/div>\n\s*<h3 className="text-2xl font-bold text-white">Pending Product Approvals<\/h3>/, "</div>\n" + pendingSellersUI + '\n                <h3 className="text-2xl font-bold text-white">Pending Product Approvals</h3>');

// Also we need handleApprovalAction to handle 'seller'.
const oldAction = "if (type === 'product') {";
const newAction = `
    if (type === 'seller') {
      await safeFetch(\`/api-v2/admin/approvals/sellers/\${id}\`, { method: 'POST', body: JSON.stringify({ action }) });
      setApprovals({ ...approvals, pendingSellers: approvals.pendingSellers.filter((s: any) => s.id !== id) });
      toast.success(\`Seller \${action}d successfully\`);
      return;
    }
    if (type === 'product') {
`;
adminTs = adminTs.replace(oldAction, newAction);

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminTs);
