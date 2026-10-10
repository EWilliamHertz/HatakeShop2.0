import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSverigeTab.tsx', 'utf8');

content = content.replace(
  /import \{ cloudinaryUpload \} from '\.\.\/lib\/cloudinary\.js';\n/,
  ''
);

content = content.replace(
  /const urls: string\[\] = \[\];\n\s*for \(let i = 0; i < files\.length; i\+\+\) \{\n\s*const url = await cloudinaryUpload\(files\[i\]\);\n\s*urls\.push\(url\);\n\s*\}/,
  `const urls: string[] = [];
      const token = await user?.getIdToken();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
        });
        const res = await fetch('/api-v2/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }`
);

fs.writeFileSync('src/components/AdminSverigeTab.tsx', content);
