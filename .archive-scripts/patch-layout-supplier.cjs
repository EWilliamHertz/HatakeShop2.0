const fs = require('fs');
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

const becomeSupplierBtn = `
                {dbUser?.role === 'buyer' && (
                  <Link to="/apply-seller" className="hidden md:flex px-4 py-2 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-bold rounded-lg items-center gap-2 transition-colors">
                    <Store className="w-4 h-4" />
                    Become a Supplier
                  </Link>
                )}
`;

if (!layout.includes('/apply-seller')) {
  // Inject right before the user dropdown logic
  layout = layout.replace('{user ? (', becomeSupplierBtn + '\n                {user ? (');
  fs.writeFileSync('src/components/Layout.tsx', layout);
}
