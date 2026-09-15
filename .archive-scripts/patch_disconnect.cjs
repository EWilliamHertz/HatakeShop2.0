const fs = require('fs');
const file = 'src/pages/RFQDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '       socket.disconnect();\n    };\n  }, [id, user]);',
  '       socket.disconnect();\n       socketRef.current = null;\n    };\n  }, [id, user]);'
);

fs.writeFileSync(file, content);
