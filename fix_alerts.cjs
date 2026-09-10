const fs = require('fs');

// Settings.tsx
let settings = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
settings = settings.replace('alert("Automated KYB', 'toast.success("Automated KYB');
settings = settings.replace('alert(data.cause', 'toast.error(data.cause');
settings = settings.replace('alert("Settings saved successfully.");', 'toast.success("Settings saved successfully.");');
fs.writeFileSync('src/pages/Settings.tsx', settings);

// AdminDashboard.tsx
let admin = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
admin = admin.replace(/alert\(/g, 'toast.error(');
fs.writeFileSync('src/pages/AdminDashboard.tsx', admin);

// SellerDashboard.tsx
let seller = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');
seller = seller.replace(/alert\(\`Successfully uploaded \$\{data.count\} items!\`\)/g, 'toast.success(`Successfully uploaded ${data.count} items!`)');
seller = seller.replace(/alert\(/g, 'toast.error(');
fs.writeFileSync('src/pages/SellerDashboard.tsx', seller);

// ImageUploader.tsx
let imgUploader = fs.readFileSync('src/components/ImageUploader.tsx', 'utf8');
if (imgUploader) {
   imgUploader = imgUploader.replace(/alert\(/g, 'toast.error(');
   fs.writeFileSync('src/components/ImageUploader.tsx', imgUploader);
}

