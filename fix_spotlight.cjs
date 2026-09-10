const fs = require('fs');
let code = fs.readFileSync('src/components/SpotlightGallery.tsx', 'utf8');

// Fix string interpolation for download
code = code.replace(
  "a.download = \\`\\${companyName.replace(/\\\\s+/g, '_')}_Asset_\\${Date.now()}.jpg\\`;",
  "a.download = `${companyName.replace(/\\s+/g, '_')}_Asset_${Date.now()}.jpg`;"
);

// Fix string interpolation for left/top
code = code.replace(
  "left: \\`-\\\${position.x * 200}vw\\`,",
  "left: `-${position.x * 200}vw`,"
);
code = code.replace(
  "top: \\`-\\\${position.y * 200}vh\\`,",
  "top: `-${position.y * 200}vh`,"
);

// Fix string interpolation for alt
code = code.replace(
  "alt={\\`Asset \\${idx}\\`}",
  "alt={`Asset ${idx}`}"
);

// Fix string interpolation for template literals in spanClass?
code = code.replace(
  "className={\\`group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 \\${spanClass}\\`}",
  "className={`group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 ${spanClass}`}"
);

fs.writeFileSync('src/components/SpotlightGallery.tsx', code);
console.log("Success");
