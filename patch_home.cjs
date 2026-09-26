const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const oldUseMemo = `  const onboardingImages = React.useMemo(() => {
    const imgs = [];
    const source = sortedHomeProducts.length > 0 ? sortedHomeProducts : homeProducts;
    for (const p of source) {
      if (!p) continue;
      let parsed = [];
      try { parsed = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
      if (parsed[0]) imgs.push(parsed[0]);
      if (imgs.length >= 25) break;
    }
    return imgs.sort(() => Math.random() - 0.5); // shuffle
  }, [sortedHomeProducts, homeProducts]);`;

const newUseMemo = `  const onboardingImages = React.useMemo(() => {
    const imgs = new Set();
    const source = sortedHomeProducts.length > 0 ? sortedHomeProducts : homeProducts;
    for (const p of source) {
      if (!p) continue;
      let parsed = [];
      try { parsed = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
      if (parsed[0]) imgs.add(parsed[0]);
    }
    return Array.from(imgs).sort(() => Math.random() - 0.5); // shuffle
  }, [sortedHomeProducts, homeProducts]);`;

code = code.replace(oldUseMemo, newUseMemo);
fs.writeFileSync('src/pages/Home.tsx', code);
