const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use a ref to prevent double initialization in StrictMode
content = content.replace(
  '  useEffect(() => {',
  '  const initRef = useRef(false);\n  useEffect(() => {\n    if (initRef.current) return;\n    initRef.current = true;'
);

fs.writeFileSync(file, content);
