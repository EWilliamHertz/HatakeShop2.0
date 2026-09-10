const fs = require('fs');
const file = 'metadata.json';
let content = fs.readFileSync(file, 'utf8');
const data = JSON.parse(content);
data.requestFramePermissions = ["camera", "microphone"];
fs.writeFileSync(file, JSON.stringify(data, null, 2));
