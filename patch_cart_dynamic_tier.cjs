const fs = require('fs');

let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const staticTierUI = `
        <div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">
          <div className="flex justify-between items-end">
             <div>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Gold Tier</p>
                <p className="text-sm text-slate-300">You are <span className="font-bold text-white">€1,200</span> away from unlocking <span className="text-[#ffcc00] font-bold">Platinum Tier (Reduced Platform Commission)</span>.</p>
             </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
             <div className="h-full bg-gradient-to-r from-cyan-500 to-[#ffcc00] rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
`;

const dynamicTierUI = `
        <div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">
          {(() => {
             const totalSpend = 0; // TODO: Fetch from user profile orders
             let currentTier = "Standard Tier";
             let nextTier = "Bronze Tier (0.5% Reduced Commission)";
             let amountAway = 1500 - totalSpend;
             let progressPercent = (totalSpend / 1500) * 100;
             let colorClass = "text-slate-400";
             let nextColorClass = "text-[#cd7f32]"; // Bronze color
             let gradientFrom = "from-slate-500";
             let gradientTo = "to-[#cd7f32]";
             
             if (totalSpend >= 25000) {
                currentTier = "Gold Tier (1.5% Reduced Commission)";
                nextTier = "Max Tier Reached!";
                amountAway = 0;
                progressPercent = 100;
                colorClass = "text-[#ffcc00]";
                gradientFrom = "from-[#ffcc00]";
                gradientTo = "to-[#ffcc00]";
             } else if (totalSpend >= 5000) {
                currentTier = "Silver Tier (1.0% Reduced Commission)";
                nextTier = "Gold Tier (1.5% Reduced Commission)";
                amountAway = 25000 - totalSpend;
                progressPercent = ((totalSpend - 5000) / 20000) * 100;
                colorClass = "text-slate-300";
                nextColorClass = "text-[#ffcc00]";
                gradientFrom = "from-slate-300";
                gradientTo = "to-[#ffcc00]";
             } else if (totalSpend >= 1500) {
                currentTier = "Bronze Tier (0.5% Reduced Commission)";
                nextTier = "Silver Tier (1.0% Reduced Commission)";
                amountAway = 5000 - totalSpend;
                progressPercent = ((totalSpend - 1500) / 3500) * 100;
                colorClass = "text-[#cd7f32]";
                nextColorClass = "text-slate-300";
                gradientFrom = "from-[#cd7f32]";
                gradientTo = "to-slate-300";
             }
             
             return (
               <>
                 <div className="flex justify-between items-end">
                    <div>
                       <p className={\`text-xs font-bold uppercase tracking-wider mb-1 \${colorClass}\`}>{currentTier}</p>
                       {amountAway > 0 ? (
                         <p className="text-sm text-slate-300">You are <span className="font-bold text-white">€{amountAway.toLocaleString()}</span> away from unlocking <span className={\`font-bold \${nextColorClass}\`}>{nextTier}</span>.</p>
                       ) : (
                         <p className="text-sm text-[#ffcc00] font-bold">Congratulations! You have reached the maximum discount tier.</p>
                       )}
                    </div>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
                    <div className={\`h-full bg-gradient-to-r \${gradientFrom} \${gradientTo} rounded-full\`} style={{ width: \`\${Math.min(100, Math.max(0, progressPercent))}%\` }}></div>
                 </div>
               </>
             );
          })()}
        </div>
`;

// Replace ignoring precise spacing
let startIndex = code.indexOf('<div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">');
let endIndex = code.indexOf('<div className="flex-1 overflow-y-auto p-6 space-y-6">');

if (startIndex !== -1 && endIndex !== -1) {
   let newCode = code.substring(0, startIndex) + dynamicTierUI.trim() + '\n\n        ' + code.substring(endIndex);
   fs.writeFileSync('src/components/SampleCart.tsx', newCode);
   console.log("Patched dynamic tier");
} else {
   console.log("Could not find patch location");
}
