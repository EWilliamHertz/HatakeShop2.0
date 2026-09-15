const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!code.includes("useTranslation")) {
   code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';");
   code = code.replace("export function AdminDashboard() {", "export function AdminDashboard() {\n  const { t } = useTranslation();");
}

code = code.replace(/>Admin Controls</g, ">{t('Admin Controls')}<");
code = code.replace(/>All Categories</g, ">{t('All Categories')}<");
code = code.replace(/>Settings</g, ">{t('Settings')}<");
code = code.replace(/>Feedback</g, ">{t('Feedback')}<");

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
