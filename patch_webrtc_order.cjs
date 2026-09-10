const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('    const localStreamRef = { current: null as MediaStream | null };\n', '');
content = content.replace('    const pendingCandidates: RTCIceCandidateInit[] = [];\n', '');

content = content.replace(
  '  useEffect(() => {\\n    socketRef.current = io();',
  '  useEffect(() => {\\n    socketRef.current = io();\\n    const localStreamRef = { current: null as MediaStream | null };\\n    const pendingCandidates: RTCIceCandidateInit[] = [];'
);

fs.writeFileSync(file, content);
