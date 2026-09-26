const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    localStorage.setItem('sample_cart', JSON.stringify(items));
  }, [items]);`;

const newEffect = `  useEffect(() => {
    localStorage.setItem('sample_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) setItems(JSON.parse(saved));
      } catch(e) {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/SampleCart.tsx', code);
