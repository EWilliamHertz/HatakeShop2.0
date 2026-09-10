const fs = require('fs');

// Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(`if (inq.status === 'Open') negotiatingCount++;`, `if (inq.status === 'Under Negotiation' || inq.status === 'Pending') negotiatingCount++;`);
fs.writeFileSync('server.ts', serverCode);

// Fix VideoTour.tsx
let videoTourCode = fs.readFileSync('src/components/VideoTour.tsx', 'utf8');
videoTourCode = videoTourCode.replace(/import\.meta\.env/g, '((import.meta) as any).env');
videoTourCode = videoTourCode.replace(/<div ref={videoRef}/g, '<video ref={videoRef}');
videoTourCode = videoTourCode.replace(/<\/div>\s*<canvas/g, '</video>\n<canvas');
// wait, the error is: Type 'RefObject<HTMLVideoElement>' is not assignable to type 'Ref<HTMLDivElement>'.
fs.writeFileSync('src/components/VideoTour.tsx', videoTourCode);
