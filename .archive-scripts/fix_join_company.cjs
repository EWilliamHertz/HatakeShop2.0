const fs = require('fs');
let code = fs.readFileSync('src/pages/JoinCompany.tsx', 'utf8');

code = code.replace(/>Join a Company</g, ">{t('Join a Company')}<");
code = code.replace(/>Secret Invite Code</g, ">{t('Secret Invite Code')}<");
code = code.replace(/>Join Workspace </g, ">{t('Join Workspace')} <");

fs.writeFileSync('src/pages/JoinCompany.tsx', code);
