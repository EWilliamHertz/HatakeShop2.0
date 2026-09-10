const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const handleClose = () => {\\n    if (localStream) {\\n      localStream.getTracks().forEach(track => track.stop());\\n    }',
  '  const handleClose = () => {\\n    if (localStreamRef.current) {\\n      localStreamRef.current.getTracks().forEach(track => track.stop());\\n    }'
);

fs.writeFileSync(file, content);
