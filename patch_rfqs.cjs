const fs = require('fs');
const file = 'src/pages/RFQHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `               </div>
             ) : (
                (Array.isArray(inquiries) ? inquiries : []).map((inq, idx) => (`;

const replacement = `               </div>
             ) : (
                Array.from(
                  (Array.isArray(inquiries) ? inquiries : []).reduce((acc, inq) => {
                     const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                     if (!acc.has(otherParty)) acc.set(otherParty, []);
                     acc.get(otherParty).push(inq);
                     return acc;
                  }, new Map())
                ).map(([company, companyInqs]: [string, any], idx) => (
                  <div key={idx} className="border-b border-slate-200 last:border-0 pb-4 mb-4 last:pb-0 last:mb-0">
                    <div className="bg-slate-50 px-6 py-2 border-y border-slate-200 mt-[-1px] font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {company}
                    </div>
                    {companyInqs.map((inq: any, subIdx: number) => (`;

const targetEnd = `                        <Link to={\`/rfq/\${inq.inquiry.id}\`} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block">
                           <ArrowRight className="w-5 h-5" />
                        </Link>
                     </div>
                  </div>
                ))
             )}
          </div>
       </div>`;

const replacementEnd = `                        <Link to={\`/rfq/\${inq.inquiry.id}\`} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block">
                           <ArrowRight className="w-5 h-5" />
                        </Link>
                     </div>
                  </div>
                    ))}
                  </div>
                ))
             )}
          </div>
       </div>`;

content = content.replace(target, replacement);
content = content.replace(targetEnd, replacementEnd);

fs.writeFileSync(file, content);
