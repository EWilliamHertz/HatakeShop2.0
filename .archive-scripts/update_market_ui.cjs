const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const target1 = `                    <div key={gIdx}>
                      {group.subcategory && (
                        <h4 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {group.subcategory.name}
                        </h4>
                      )}`;

const new1 = `                    <div key={gIdx} className="mb-8 border-b border-slate-100 pb-8 last:border-0 last:mb-0 last:pb-0">
                      {group.seller && (
                        <h4 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Top Listings from {group.seller.companyName}
                        </h4>
                      )}`;

code = code.replace(target1, new1);
code = code.replace(`lg:grid-cols-4 gap-6"`, `lg:grid-cols-5 gap-6"`);

const target2 = `                    </div>
                  ))}
                    </div>
                  </div>
                ))}
                </div>`;

const new2 = `                    </div>
                  ))}
                        <Link to={\`/company/\${group.seller.id}\`} onClick={() => window.scrollTo(0, 0)} className="group bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6 cursor-pointer">
                           <div className="w-14 h-14 rounded-full bg-white shadow-sm text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                              <ChevronRight className="w-7 h-7 ml-1" />
                           </div>
                           <span className="font-bold text-slate-800 group-hover:text-indigo-900 mb-1">View all listings</span>
                           <span className="text-xs font-semibold text-slate-500">from {group.seller.companyName}</span>
                        </Link>
                    </div>
                  </div>
                ))}
                </div>`;

code = code.replace(target2, new2);
fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Success");
