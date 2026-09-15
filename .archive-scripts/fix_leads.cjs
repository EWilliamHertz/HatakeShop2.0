const fs = require('fs');
let code = fs.readFileSync('src/pages/Leads.tsx', 'utf8');

if (!code.includes("useTranslation")) {
   code = code.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
   code = code.replace("export function Leads() {", "export function Leads() {\n  const { t } = useTranslation();");
}

code = code.replace(/>Partners \& Leads Directory</g, ">{t('Partners & Leads Directory')}<");
code = code.replace(/>Discover the top TCG companies, retailers, and communities joining our ecosystem\.</g, ">{t('Discover the top TCG companies, retailers, and communities joining our ecosystem.')}<");
code = code.replace(/>Loading directory\.\.\.</g, ">{t('Loading directory...')}<");
code = code.replace(/>Signed Up</g, ">{t('Signed Up')}<");
code = code.replace(/>No partners found\.</g, ">{t('No partners found.')}<");
code = code.replace(/>Unknown Company</g, ">{t('Unknown Company')}<");

fs.writeFileSync('src/pages/Leads.tsx', code);
