const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldRoll = `        {[...Array(5)].map((_, colIdx) => {
          let colItems = [...MOCK_PRODUCTS];
          if (backgroundImages.length > 0) {
             const colSize = Math.max(5, Math.ceil(backgroundImages.length / 5));
             const start = colIdx * colSize;
             colItems = backgroundImages.slice(start, start + colSize);
             if (colItems.length === 0) colItems = backgroundImages.slice(0, colSize);
          }
          // Duplicate items to create a seamless infinite scroll loop
          const displayItems = [...colItems, ...colItems, ...colItems];`;

const newRoll = `        {[...Array(5)].map((_, colIdx) => {
          let colItems = [...MOCK_PRODUCTS];
          if (backgroundImages.length > 0) {
             let pool = [...backgroundImages];
             // Ensure the pool is large enough so every column gets exactly the same size slice without running out
             while (pool.length < 25) {
                pool = [...pool, ...[...backgroundImages].sort(() => Math.random() - 0.5)];
             }
             const colSize = Math.max(5, Math.ceil(pool.length / 5));
             const start = colIdx * colSize;
             colItems = pool.slice(start, start + colSize);
          }
          // Duplicate items to create a seamless infinite scroll loop
          const displayItems = [...colItems, ...colItems, ...colItems];`;

code = code.replace(oldRoll, newRoll);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
