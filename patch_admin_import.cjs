const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

if (!content.includes("import { Link }")) {
  content = content.replace("import { useTranslation }", "import { useTranslation } from 'react-i18next';\nimport { Link } from 'react-router-dom';");
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
}
