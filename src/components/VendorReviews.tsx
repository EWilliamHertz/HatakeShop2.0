import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { SpotlightGallery } from './SpotlightGallery';

export function VendorReviews({ vendorId }: { vendorId: number }) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightImages, setSpotlightImages] = useState<string[]>([]);

  const { data: reviews = [] } = useQuery({
    queryKey: ['vendorReviews', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api-v2/users/${vendorId}/reviews`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    }
  });

  if (reviews.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Verified Reviews</h3>
        <p className="text-slate-400 text-sm">No reviews yet.</p>
      </div>
    );
  }

  const averageRating = (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-bold text-white">Verified Reviews</h3>
        <div className="flex items-center bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
          <Star className="w-4 h-4 text-[#ffcc00] mr-1.5 fill-current" />
          <span className="text-slate-100 font-bold">{averageRating}</span>
          <span className="text-slate-400 ml-1 text-sm">({reviews.length})</span>
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map((r: any) => (
          <div key={r.id} className="border-b border-slate-700/50 pb-6 last:border-0 last:pb-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-slate-100">{r.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{r.reviewer?.companyName || r.reviewer?.displayName || 'Verified Buyer'}</p>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-[#ffcc00] fill-current' : 'text-slate-600'}`} />
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
            
            {r.images && r.images.length > 0 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                {r.images.map((img: string, idx: number) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="Review Attachment" 
                    className="w-20 h-20 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20 transition-all" 
                    onClick={() => {
                      setSpotlightImages(r.images);
                      setSpotlightOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <SpotlightGallery 
        isOpen={spotlightOpen} 
        onClose={() => setSpotlightOpen(false)} 
        images={spotlightImages} 
        companyName="Review Gallery" 
      />
    </div>
  );
}
