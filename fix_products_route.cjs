const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      const maxPrice = req.query.maxPrice as string;
      const categoryId = req.query.category as string;
      
      const page = parseInt(req.query.page as string) || 1;`;

const replacement = `      const maxPrice = req.query.maxPrice as string;
      const categoryId = req.query.category as string;
      const productType = req.query.productType as string;
      
      const page = parseInt(req.query.page as string) || 1;`;

if(code.includes(target)) {
    fs.writeFileSync('server.ts', code.replace(target, replacement));
    console.log("Success");
} else {
    console.log("Target not found!");
}
