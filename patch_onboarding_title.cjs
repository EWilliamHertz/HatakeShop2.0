const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldHeader = `<h2 className="text-3xl font-black text-white mb-4">Profile Configured!</h2>`;
const newHeader = `<h2 className="text-3xl font-black text-white mb-4">{historyLog?.wantsCart && historyLog?.cartItems?.length ? "Profile & Cart Ready!" : "Profile Configured!"}</h2>`;

code = code.replace(oldHeader, newHeader);

const oldText = `<p className="text-slate-400 max-w-md mx-auto">Your marketplace experience has been personalized based on your needs.</p>`;
const newText = `<p className="text-slate-400 max-w-md mx-auto">{historyLog?.wantsCart && historyLog?.cartItems?.length ? \`We automatically added \${historyLog.cartItems.length} recommended products to your cart based on your budget!\` : "Your marketplace experience has been personalized based on your needs."}</p>`;

code = code.replace(oldText, newText);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
