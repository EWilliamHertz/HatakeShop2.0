const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `      if (!appCertificate) {
         // If they have no cert, they can't generate a token.
         return res.json({ token: null });
      }
      
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
      res.json({ token });`;

const replacement = `      if (!appCertificate) {
         // If they have no cert, they can't generate a token.
         return res.json({ appId, token: null });
      }
      
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
      res.json({ appId, token });`;

content = content.replace(target, replacement);

const target2 = `const appId = process.env.VITE_AGORA_APP_ID;`;
const replacement2 = `const appId = process.env.VITE_AGORA_APP_ID || process.env.AGORA_APP_ID;`;
content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
