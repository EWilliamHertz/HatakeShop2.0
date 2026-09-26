const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldHeader = `<h2 className="text-3xl font-bold text-white mb-4">Profile Configured!</h2>`;
const newHeader = `<h2 className="text-3xl font-bold text-white mb-4">{historyLog?.wantsCart && historyLog?.cartItems?.length ? "Profile & Cart Ready!" : "Profile Configured!"}</h2>`;
code = code.replace(oldHeader, newHeader);

const oldText = `<p className="text-cyan-100/70 mb-8 text-lg">Your personalized marketplace is ready. How would you like to proceed?</p>`;
const newText = `<p className="text-cyan-100/70 mb-8 text-lg">{historyLog?.wantsCart && historyLog?.cartItems?.length ? \`We automatically added \${historyLog.cartItems.length} recommended products to your cart based on your budget! How would you like to proceed?\` : "Your personalized marketplace is ready. How would you like to proceed?"}</p>`;
code = code.replace(oldText, newText);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
