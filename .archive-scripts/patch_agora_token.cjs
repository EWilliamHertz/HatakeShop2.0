const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const route = `  app.post("/api/agora-token", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const { channelName } = req.body;
      if (!channelName) return res.status(400).json({ error: "channelName is required" });
      
      const appId = process.env.VITE_AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE || "e7c7261099e64c2596b8f00ca120a585";
      
      if (!appId) return res.status(400).json({ error: "Agora App ID is missing" });
      
      const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
      const uid = 0; // 0 allows Agora to assign a dynamic integer UID
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      
      if (!appCertificate) {
         // If they have no cert, they can't generate a token.
         return res.json({ token: null });
      }
      
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
      res.json({ token });
    } catch (e: any) {
      console.error("Agora Token Error:", e);
      res.status(500).json({ error: e.message });
    }
  });`;

const target = '  app.post("/api/inquiries", requireAuth, async (req: AuthRequest, res) => {';
content = content.replace(target, route + '\n\n' + target);
fs.writeFileSync(file, content);
