const fs = require('fs');
const file = 'src/pages/SellerDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar } from 'recharts';`;
const replacement = `import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';`;

const target2 = `              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Inventory Value by Category</h3>
                    <p className="text-xs text-slate-500 mb-4">Value per stock quantity per category for all active listings.</p>
                    <div className="h-72">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analyticsData?.barChartData || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="value" name="Inventory Value (€)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Value of Sold Products by Category</h3>
                    <p className="text-xs text-slate-500 mb-4">Total value of all accepted and paid RFQs per category.</p>
                    <div className="h-72">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analyticsData?.soldBarChartData || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="value" name="Sold Value (€)" fill="#10b981" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>`;

const replacement2 = `              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 self-start">Sales Funnel (All Time)</h3>
                    <div className="h-72 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={analyticsData?.funnelData || []}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="value"
                             label={({name, percent}) => \`\${name} (\${(percent * 100).toFixed(0)}%)\`}
                             labelLine={false}
                           >
                             {(analyticsData?.funnelData || []).map((entry: any, index: number) => (
                               <Cell key={\`cell-\${index}\`} fill={entry.fill} />
                             ))}
                           </Pie>
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Top Selling Value by Category</h3>
                    <div className="h-72">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analyticsData?.barChartData || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="revenue" name="Total Value (€)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>`;

content = content.replace(target, replacement).replace(target2, replacement2);
fs.writeFileSync(file, content);
