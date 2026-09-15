const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');
code = code.replace("import React,\nimport { toast } from 'sonner'; { useEffect, useState, useRef } from 'react';", "import React, { useEffect, useState, useRef } from 'react';\nimport { toast } from 'sonner';");
fs.writeFileSync('src/pages/RFQDetails.tsx', code);
