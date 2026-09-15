const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const badCode = `      // Auto-translate messages if user has preferredLanguage
      if (userProfile.preferredLanguage && userProfile.preferredLanguage !== 'en') {
        const translatedMessages = await Promise.all(
          msgs.map(async (msg) => {
            // Only translate if message is not from the current user
            if (msg.senderId !== userProfile.id && msg.content) {
              const translated = await getTranslatedMessage(msg.content, msg.id, userProfile.preferredLanguage);
              return { ...msg, content: translated, originalContent: msg.content };
            }
            return msg;
          })
        );
        res.json(translatedMessages);
        return;
      }`;

const goodCode = `      // Auto-translate messages if user has preferredLanguage
      if (userProfile.preferredLanguage && userProfile.preferredLanguage !== 'en') {
        const translatedMessages = await Promise.all(
          mappedMsgs.map(async (msg) => {
            // Only translate if message is not from the current user
            if (msg.senderId !== userProfile.id && msg.text) {
              const translated = await getTranslatedMessage(msg.text, msg.id, userProfile.preferredLanguage);
              return { ...msg, text: translated, originalText: msg.text };
            }
            return msg;
          })
        );
        res.json(translatedMessages);
        return;
      }`;

code = code.replace(badCode, goodCode);

// There was also a fallback \`res.json(msgs)\` at the bottom of the endpoint in my previous patch, but it should be \`res.json(mappedMsgs)\`.
code = code.replace('res.json(msgs);\n    } catch', 'res.json(mappedMsgs);\n    } catch');

fs.writeFileSync('server.ts', code);
