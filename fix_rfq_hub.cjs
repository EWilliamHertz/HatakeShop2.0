const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

// Add VideoTour import
code = code.replace(`import { useAuth } from '../components/AuthContext.tsx';`, `import { useAuth } from '../components/AuthContext.tsx';\nimport { VideoTour } from '../components/VideoTour.tsx';\nimport { io, Socket } from 'socket.io-client';\nimport { useTranslation } from 'react-i18next';`);

// We already have useTranslation in RFQHub? Let's check.
