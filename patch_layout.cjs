const fs = require('fs');
const file = 'src/components/Layout.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `import { useState, useEffect } from 'react';`;
const replacement = `import { useState, useEffect } from 'react';\nimport { PWAInstallButton } from './PWAInstallButton.tsx';`;
content = content.replace(target, replacement);

const target2 = `              </Link>
            </div>
            
            <div className="flex items-center space-x-4">`;
const replacement2 = `              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <PWAInstallButton />`;
content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
