const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [needsAgoraKey, setNeedsAgoraKey] = useState(false);',
  'const [needsAgoraKey, setNeedsAgoraKey] = useState<string | false>(false);'
);

content = content.replace(
  'setNeedsAgoraKey(true);',
  'setNeedsAgoraKey("The voice/video call feature uses Agora RTC for reliable connections. Please provide your VITE_AGORA_APP_ID in the settings to enable live calls.");'
);

content = content.replace(
  'setNeedsAgoraKey(true); // Re-use the UI prompt, maybe tweak the message',
  'setNeedsAgoraKey("Agora connection failed. If your project has an App Certificate enabled, please disable it for testing, or ensure your App ID is correct.");'
);

content = content.replace(
  'The voice/video call feature uses Agora RTC for reliable connections. Please provide your <strong>VITE_AGORA_APP_ID</strong> in the settings to enable live calls.',
  '{needsAgoraKey}'
);

fs.writeFileSync(file, content);
