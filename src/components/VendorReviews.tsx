import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { ReviewModal } from './ReviewModal';

export function VendorReviews({ vendorId }: { vendorId: number }) {
  const [selectedReview, setSelectedReview] = useState<any>(null);

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
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-semibold text-white">{r.author?.displayName || 'Verified Buyer'}</span>
                <div className="text-xs text-slate-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-[#ffcc00] fill-current' : 'text-slate-600'}`} />
                ))}
              </div>
            </div>
            <p 
              className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-white transition-colors"
              onClick={() => setSelectedReview(r)}
            >
              {r.comment}
            </p>
            
            {r.images && r.images.length > 0 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                {r.images.map((img: string, idx: number) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="Review Attachment" 
                    className="w-20 h-20 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20 transition-all" 
                    onClick={() => setSelectedReview(r)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedReview && (
        <ReviewModal review={selectedReview} onClose={() => setSelectedReview(null)} />
      )}
    </div>
  );
}
