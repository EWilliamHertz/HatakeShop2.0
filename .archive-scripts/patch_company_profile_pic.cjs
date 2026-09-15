const fs = require('fs');
let content = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf-8');

const oldBanner = `<div className="space-y-2 flex flex-col">
                           <label className="text-sm font-semibold tracking-tight text-slate-300 flex justify-between">
                             <span>{t('Banner Image')}</span>`;

const newBanner = `<div className="space-y-2 flex flex-col">
                           <label className="text-sm font-semibold tracking-tight text-slate-300 flex justify-between">
                             <span>{t('Profile Picture')}</span>
                           </label>
                           <div className="flex flex-col gap-2">
                             {formData.profilePictureUrl && (
                                <div className="h-16 w-16 rounded-full overflow-hidden border border-[var(--color-hairline)] bg-slate-900 shrink-0">
                                  <img src={formData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                             )}
                             <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all w-full flex items-center justify-center px-4 py-2 cursor-pointer">
                               <Upload className="w-4 h-4 mr-2" /> {t('Upload Profile Pic')}
                               <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('profilePictureUrl')} />
                             </label>
                           </div>
                        </div>
                        <div className="space-y-2 flex flex-col">
                           <label className="text-sm font-semibold tracking-tight text-slate-300 flex justify-between">
                             <span>{t('Banner Image')}</span>`;

if (content.includes(oldBanner)) {
  content = content.replace(oldBanner, newBanner);
  fs.writeFileSync('src/pages/CompanySettings.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Could not find old banner block");
}
