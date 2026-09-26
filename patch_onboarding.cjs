const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldMocks = `const MOCK_PRODUCTS = [
  { img: "https://i.ibb.co/d4NFtnjQ/Gem-Pack-V5.jpg", name: "Pokemon Gem Pack V.5" },
  { img: "https://i.ibb.co/3sXzj9H/OP05.jpg", name: "One Piece OP-05" },
  { img: "https://i.ibb.co/Pzhd8kK/Lorcana.jpg", name: "Disney Lorcana First Chapter" },
  { img: "https://i.ibb.co/C0W2kQp/Naruto.jpg", name: "Naruto Kayou Tier 4" },
  { img: "https://i.ibb.co/m0fTjF1/DBZ.jpg", name: "Dragon Ball Super" },
  { img: "https://i.ibb.co/F8qG6Kx/YGO.jpg", name: "Yu-Gi-Oh 25th Anniversary" }
];`;

const newMocks = `const MOCK_PRODUCTS = [
  { bg: "bg-gradient-to-br from-red-600 to-yellow-500", name: "Pokemon Gem Pack V.5", type: "Pokemon" },
  { bg: "bg-gradient-to-br from-blue-600 to-cyan-400", name: "One Piece OP-05", type: "One Piece" },
  { bg: "bg-gradient-to-br from-purple-600 to-pink-500", name: "Disney Lorcana First Chapter", type: "Lorcana" },
  { bg: "bg-gradient-to-br from-orange-600 to-red-500", name: "Naruto Kayou Tier 4", type: "Naruto" },
  { bg: "bg-gradient-to-br from-yellow-500 to-green-600", name: "Dragon Ball Super", type: "DBZ" },
  { bg: "bg-gradient-to-br from-slate-700 to-slate-900", name: "Yu-Gi-Oh 25th Anniversary", type: "Yu-Gi-Oh" },
  { bg: "bg-gradient-to-br from-teal-500 to-emerald-600", name: "Weiss Schwarz", type: "Weiss" },
  { bg: "bg-gradient-to-br from-indigo-600 to-violet-500", name: "Magic The Gathering", type: "MTG" }
];`;

code = code.replace(oldMocks, newMocks);

const oldImg = `<img src={p.img} alt={p.name} className="w-full h-full object-cover grayscale opacity-50" />`;
const newImg = `<div className={\`w-full h-full \${p.bg} flex items-center justify-center opacity-60\`}>
                    <span className="text-white/80 font-black text-2xl rotate-[-45deg] whitespace-nowrap tracking-wider drop-shadow-md">{p.type}</span>
                  </div>`;

code = code.replace(oldImg, newImg);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
