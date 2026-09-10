import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, StarHalf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

export function StarRating({ rating, size = 16 }: { rating: number, size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${star <= rating ? 'fill-accent text-[#ffcc00]' : 'text-hairline fill-transparent'} transition-colors`}
        />
      ))}
    </div>
  );
}

export function VendorReviews({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['vendorReviews', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api-v2/users/${vendorId}/reviews`);
      if (res.ok) return res.json();
      return [];
    },
    enabled: !!vendorId
  });

  if (isLoading) {
    return <div className="text-slate-400 text-sm p-4 text-center">{t('Loading reviews...')}</div>;
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100">{t('Vendor Feedback')}</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700">
            <StarRating rating={Number(avgRating)} />
            <span className="text-sm font-semibold text-slate-100">{avgRating}</span>
            <span className="text-xs text-slate-400">({reviews.length} {t('reviews')})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="p-8 text-center bg-slate-800 rounded-xl border border-slate-700">
          <Star className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">{t('No reviews yet.')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('Reviews are unlocked after a verified B2B transaction.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="p-5 bg-slate-800 rounded-xl border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-700 flex items-center justify-center font-bold text-slate-100">
                    {review.reviewer?.companyName?.charAt(0) || review.reviewer?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-slate-100">
                      {review.reviewer?.companyName || review.reviewer?.displayName || 'Anonymous Buyer'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>
              {review.title && <h4 className="font-semibold text-slate-100 text-sm mb-1">{review.title}</h4>}
              {review.comment && <p className="text-sm text-slate-400 leading-relaxed">{review.comment}</p>}
              
              {review.targetProductId && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-xs font-medium text-slate-100 bg-slate-700 px-2 py-1 rounded">
                    {t('Verified Purchase')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
