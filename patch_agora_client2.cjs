const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    const initAgora = async () => {
      try {
        const appId = import.meta.env.VITE_AGORA_APP_ID;
        if (!appId) {
           setNeedsAgoraKey("The voice/video call feature uses Agora RTC for reliable connections. Please provide your VITE_AGORA_APP_ID in the settings to enable live calls.");
           return;
        }`;

const replacement = `    const initAgora = async () => {
      try {
        let appId = import.meta.env.VITE_AGORA_APP_ID;`;

content = content.replace(target, replacement);

const target2 = `        // Fetch Token
        let token = null;
        try {
           const idToken = await user?.getIdToken();
           const res = await fetch('/api/agora-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${idToken}\` },
              body: JSON.stringify({ channelName: \`inq_\${inquiryId}\` })
           });
           const data = await res.json();
           if (data.token) {
              token = data.token;
           }
        } catch (e) {
           console.warn("Failed to fetch token, trying without one", e);
        }`;

const replacement2 = `        // Fetch Token
        let token = null;
        try {
           const idToken = await user?.getIdToken();
           const res = await fetch('/api/agora-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${idToken}\` },
              body: JSON.stringify({ channelName: \`inq_\${inquiryId}\` })
           });
           const data = await res.json();
           if (data.appId) {
              appId = data.appId;
           }
           if (data.token) {
              token = data.token;
           }
        } catch (e) {
           console.warn("Failed to fetch token, trying without one", e);
        }

        if (!appId) {
           setNeedsAgoraKey("The voice/video call feature uses Agora RTC for reliable connections. Please provide your VITE_AGORA_APP_ID in the settings to enable live calls.");
           return;
        }`;
        
content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
