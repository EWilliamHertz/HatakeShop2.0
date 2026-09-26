const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldMemo = `  const backgroundImages = useMemo(() => {
    const imgs = new Set<string>();
    const source = homeProductsData?.products || [];
    for (const p of source) {
      if (!p) continue;
      let parsed: string[] = [];
      try { parsed = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
      if (parsed[0]) imgs.add(parsed[0]);
    }
    return Array.from(imgs).sort(() => Math.random() - 0.5);
  }, [homeProductsData]);`;

const newMemo = `  const backgroundImages = useMemo(() => {
    const imgs = new Set<string>();
    const source = homeProductsData?.products || [];
    for (const p of source) {
      if (!p) continue;
      let parsed: string[] = [];
      try { parsed = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
      if (parsed[0]) imgs.add(parsed[0]);
    }
    let uniqueImgs = Array.from(imgs).sort(() => Math.random() - 0.5);
    // Pad the array to ensure the rainbow circle is fully populated (e.g., at least 40 items)
    if (uniqueImgs.length > 0) {
      while (uniqueImgs.length < 40) {
        uniqueImgs = [...uniqueImgs, ...Array.from(imgs).sort(() => Math.random() - 0.5)];
      }
    }
    return uniqueImgs;
  }, [homeProductsData]);`;

code = code.replace(oldMemo, newMemo);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
