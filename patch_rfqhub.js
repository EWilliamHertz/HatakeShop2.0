const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

// Replace standard imports
code = code.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { MessageSquare, Users, FileText, Phone, Video } from 'lucide-react';");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
