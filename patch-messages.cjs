const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf-8');

if (!serverTs.includes('getTranslatedMessage')) {
  serverTs = serverTs.replace('import { getUserProfile } from "./src/db/users.js";', 'import { getUserProfile } from "./src/db/users.js";\nimport { getTranslatedMessage } from "./src/lib/translate.js";');
}

const applyMessageTranslations = `
      // Auto-translate messages if user has preferredLanguage
      if (userProfile.preferredLanguage && userProfile.preferredLanguage !== 'en') {
        const translatedMessages = await Promise.all(
          msgs.map(async (msg) => {
            // Only translate if message is not from the current user
            if (msg.senderId !== userProfile.id && msg.content) {
              const translated = await getTranslatedMessage(msg.content, msg.id, userProfile.preferredLanguage);
              return { ...msg, content: translated };
            }
            return msg;
          })
        );
        res.json(translatedMessages);
        return;
      }

      res.json(msgs);
`;

serverTs = serverTs.replace('res.json(msgs);', applyMessageTranslations);
fs.writeFileSync('server.ts', serverTs);
