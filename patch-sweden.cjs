const fs = require('fs');
let content = fs.readFileSync('src/pages/SwedenShop.tsx', 'utf8');

const regex = /const sverigeProducts = \[\s*\{.*?\}\s*\];/s;
content = content.replace(regex, '');

content = content.replace(
  /export function SwedenShop\(\) \{/,
  `export function SwedenShop() {
  const { addSverigeItem } = useCart();
  const [sverigeProducts, setSverigeProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api-v2/sverige-products')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSverigeProducts(data))
      .catch(console.error);
  }, []);`
);

fs.writeFileSync('src/pages/SwedenShop.tsx', content);
