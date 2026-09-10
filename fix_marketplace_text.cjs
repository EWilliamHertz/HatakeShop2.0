const fs = require('fs');

const path = 'src/pages/Marketplace.tsx';
let code = fs.readFileSync(path, 'utf8');

const text1 = "Whether you are sourcing multi-tonne shipments for custom white-label manufacturing, or procuring smaller volumes of established, ready-to-ship brands, Hatake.Shop bridges the gap. Designed to empower vendors of all sizes—allowing you to seamlessly procure goods at massive scale, or distribute your existing inventory to a global network of buyers.";

const text2 = "Our relentless B2B outreach engine actively onboards over 100 new TCG vendors every single day. This aggressive expansion guarantees our marketplace consistently delivers a massive influx of fresh inventory, driving highly competitive wholesale pricing and continually connecting new buyers with our network of approved sellers.";

code = code.replace(text1, `{t('${text1}')}`);
code = code.replace(text2, `{t('${text2}')}`);

fs.writeFileSync(path, code);
