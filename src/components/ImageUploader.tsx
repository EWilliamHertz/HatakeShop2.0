import { toast } from 'sonner';
import React, { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const uploadPromises = Array.from(files).map(async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '6f1a5bbe6a6a3a4fb49fd2f8b303d8f5';
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'Failed to upload');
        return data.data.url;
      });

      const newUrls = await Promise.all(uploadPromises);
      onChange([...(images || []), ...newUrls].filter(Boolean));
    } catch (err) {
      console.error("Error uploading images:", err);
      toast.error("Failed to upload some images.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold tracking-tight text-slate-400">Gallery Photos</label>
      
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((img, i) => (
            <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-slate-700">
              <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[10px] text-center py-0.5">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center w-full">
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900 hover:bg-slate-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
               <Loader2 className="w-8 h-8 mb-3 text-indigo-500 animate-spin" />
            ) : (
               <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
            )}
            <p className="mb-2 text-sm text-slate-400">
              {isUploading ? 'Uploading...' : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
            </p>
            <p className="text-xs text-slate-400">SVG, PNG, JPG or GIF (MAX. 800x800px)</p>
          </div>
          <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} disabled={isUploading} />
        </label>
      </div>
      
      <div className="mt-2">
         <p className="text-xs text-slate-400 mb-1">Or paste image URLs (comma separated):</p>
         <input 
            type="text"
            placeholder="https://example.com/image.jpg"
            value={(images || []).filter(img => (typeof img === 'string' && (img.startsWith('http') || img.startsWith('/api-v2/images')))).join(', ')} 
            onChange={e => {
               const urls = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
               const nonUrls = (images || []).filter(img => !((typeof img === 'string' && (img.startsWith('http') || img.startsWith('/api-v2/images')))));
               onChange([...nonUrls, ...urls]);
            }}
            className="w-full bg-slate-900 text-slate-100 px-3 py-2 text-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
         />
      </div>
    </div>
  );
}
