const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        // Join Agora Channel
        if (clientRef.current.connectionState === "DISCONNECTED") {
           await clientRef.current.join(appId, \`inq_\${inquiryId}\`, null, null);
        }`;

const replacement = `        // Fetch Token
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
        }

        // Join Agora Channel
        if (clientRef.current.connectionState === "DISCONNECTED") {
           await clientRef.current.join(appId, \`inq_\${inquiryId}\`, token, null);
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
