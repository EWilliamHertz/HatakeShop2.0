const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    const initAgora = async () => {
      try {
        const appId = import.meta.env.VITE_AGORA_APP_ID;
        if (!appId) {
           setNeedsAgoraKey("API Key Required\\nAgora connection failed. If your project has an App Certificate enabled, please disable it for testing, or ensure your App ID is correct.");
           return;
        }

        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        
        if (!clientRef.current) {
            clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        }

        // Fetch Token
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

const replacement = `    const initAgora = async () => {
      try {
        // Fetch Token and App ID
        let token = null;
        let appId = null;
        try {
           const idToken = await user?.getIdToken();
           const res = await fetch('/api/agora-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${idToken}\` },
              body: JSON.stringify({ channelName: \`inq_\${inquiryId}\` })
           });
           const data = await res.json();
           if (data.error) {
              setNeedsAgoraKey(data.error);
              return;
           }
           appId = data.appId;
           if (data.token) {
              token = data.token;
           }
        } catch (e) {
           console.warn("Failed to fetch token, trying without one", e);
        }

        if (!appId) {
           setNeedsAgoraKey("API Key Required\\nAgora connection failed. Please ensure your VITE_AGORA_APP_ID or AGORA_APP_ID is saved in AI Studio settings.");
           return;
        }

        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        
        if (!clientRef.current) {
            clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        }

        // Join Agora Channel
        if (clientRef.current.connectionState === "DISCONNECTED") {
           await clientRef.current.join(appId, \`inq_\${inquiryId}\`, token, null);
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
