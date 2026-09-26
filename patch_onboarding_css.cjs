const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldDiv = `        <motion.div 
          className="absolute w-[240vh] h-[240vh] rounded-full"
          style={{ top: '30vh', left: '50%', transform: 'translateX(-50%)' }}
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 150, ease: "linear" }}
        >`;

const newDiv = `        <motion.div 
          className="absolute w-[240vh] h-[240vh] rounded-full"
          style={{ top: '30vh', left: '50%' }}
          initial={{ x: "-50%" }}
          animate={{ x: "-50%", rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 150, ease: "linear" }}
        >`;

code = code.replace(oldDiv, newDiv);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
