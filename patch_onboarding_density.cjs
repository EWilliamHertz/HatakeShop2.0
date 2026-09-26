const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldLogic = `    let uniqueImgs = Array.from(imgs).sort(() => Math.random() - 0.5);
    // Pad the array to ensure the rainbow circle is fully populated (e.g., at least 40 items)
    if (uniqueImgs.length > 0) {
      while (uniqueImgs.length < 40) {
        uniqueImgs = [...uniqueImgs, ...Array.from(imgs).sort(() => Math.random() - 0.5)];
      }
    }
    return uniqueImgs;`;

const newLogic = `    let uniqueImgs = Array.from(imgs).sort(() => Math.random() - 0.5);
    const TARGET_DENSITY = 48; // Exactly 48 items is the perfect density
    
    if (uniqueImgs.length > 0) {
      // If we don't have enough, pad it by repeating (fallback)
      while (uniqueImgs.length < TARGET_DENSITY) {
        uniqueImgs = [...uniqueImgs, ...Array.from(imgs).sort(() => Math.random() - 0.5)];
      }
      // If we have more than the target density, slice it to maintain the perfect spacing
      uniqueImgs = uniqueImgs.slice(0, TARGET_DENSITY);
    }
    return uniqueImgs;`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
