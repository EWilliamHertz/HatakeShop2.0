const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'await clientRef.current.publish(tracks);',
  'if (tracks.length > 0) {\n            await clientRef.current.publish(tracks);\n        }'
);

fs.writeFileSync(file, content);
