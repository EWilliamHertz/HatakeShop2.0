const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

// We will do a full rewrite of VideoTour.tsx because it's too fragile to patch with regex for a complete WebRTC -> Agora switch

