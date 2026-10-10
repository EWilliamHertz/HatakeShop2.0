import fs from 'fs';
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

content = content.replace(
  /const \[loading, setLoading\] = React\.useState\(false\);/,
  `const [loading, setLoading] = React.useState(false);\n  React.useEffect(() => { setChecked(product.isSverigeB2c || false) }, [product.isSverigeB2c]);`
);

fs.writeFileSync('src/components/AdminListings.tsx', content);
