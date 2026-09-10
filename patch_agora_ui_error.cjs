const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      } catch (err) {
        console.error("Failed to initialize Agora RTC", err);
      }`;

const replacement = `      } catch (err: any) {
        console.error("Failed to initialize Agora RTC", err);
        if (err?.code === 'CAN_NOT_GET_GATEWAY_SERVER' || err?.message?.includes('token')) {
           setNeedsAgoraKey(true); // Re-use the UI prompt, maybe tweak the message
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
