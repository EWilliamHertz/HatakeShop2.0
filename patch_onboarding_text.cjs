const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldText = 'We automatically added ${historyLog.cartItems.length} recommended products to your cart based on your budget! How would you like to proceed?';
const newText = 'We automatically added ${historyLog.cartItems.reduce((acc: any, item: any) => acc + (item.quantity || 1), 0)} total units (across ${historyLog.cartItems.length} distinct products) to your cart based on your budget! How would you like to proceed?';

code = code.replace(oldText, newText);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
