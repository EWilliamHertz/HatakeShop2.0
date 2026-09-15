const fs = require('fs');
let code = fs.readFileSync('src/routes/seller.ts', 'utf-8');
code = code.replace(/cardYear: isNaN\(parsedYear\) \? null : parsedYear,/g, 'cardYear: isNaN(parsedYear) ? null : parsedYear.toString(),');
fs.writeFileSync('src/routes/seller.ts', code);
