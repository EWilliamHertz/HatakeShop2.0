const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const oldState = `  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sample_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });`;

const newState = `  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sample_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });`;

code = code.replace(oldState, newState);

const oldStorage = `  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) setItems(JSON.parse(saved));
      } catch(e) {}
    };`;

const newStorage = `  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch(e) {}
    };`;

code = code.replace(oldStorage, newStorage);

const oldRemove = `  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };`;

const newRemove = `  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => String(i.productId) !== String(productId)));
  };`;

code = code.replace(oldRemove, newRemove);
fs.writeFileSync('src/components/SampleCart.tsx', code);
