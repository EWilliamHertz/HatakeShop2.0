const fs = require('fs');

let settings = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
if (!settings.includes("import { toast }")) {
   settings = settings.replace("import { useAuth }", "import { useAuth }\nimport { toast } from 'sonner';");
   fs.writeFileSync('src/pages/Settings.tsx', settings);
}

let img = fs.readFileSync('src/components/ImageUploader.tsx', 'utf8');
if (!img.includes("import { toast }")) {
   img = img.replace("import React,", "import React,");
   // just append it to the top
   img = "import { toast } from 'sonner';\n" + img;
   fs.writeFileSync('src/components/ImageUploader.tsx', img);
}
