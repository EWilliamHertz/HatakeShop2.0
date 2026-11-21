import React, { useState, useEffect } from 'react';
import { X, Star, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { SafeImage } from './SafeImage.tsx';

interface ReviewModalProps {
  review: any;
  initialImageIndex?: number;
  onClose: () => void;
}

export function ReviewModal({ review, initialImageIndex = 0, onClose }: ReviewModalProps) {
  const imgs: string[] = Array.isArray(review?.images) ? review.images : [];
  const [activeIndex, setActiveIndex] = useState(
    initialImageIndex >= 0 && initialImageIndex < imgs.length ? initialImageIndex : 0
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (initialImageIndex >= 0 && initialImageIndex < imgs.length) {
      setActiveIndex(initialImageIndex);
    }
  }, [initialImageIndex, imgs.length]);

  const activeImage = imgs[activeIndex] || null;

  if (isFullscreen && activeImage) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4 theme-keep-dark">
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="absolute top-6 right-6 p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors z-10 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
        {imgs.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((activeIndex - 1 + imgs.length) % imgs.length)}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/15 hover:bg-white/25 text-white rounded-full z-10 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((activeIndex + 1) % imgs.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/15 hover:bg-white/25 text-white rounded-full z-10 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        <SafeImage
          src={activeImage}
          alt="Review attachment fullscreen"
          className="max-w-full max-h-full object-contain cursor-zoom-out"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left side: Gallery */}
        <div className="md:w-1/2 bg-slate-950 flex flex-col p-6 border-b md:border-b-0 md:border-r border-slate-800">
          <div className="flex-1 min-h-[280px] bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden mb-4 relative group">
            {activeImage ? (
              <>
                <div onClick={() => setIsFullscreen(true)} className="w-full h-full cursor-zoom-in">
                  <SafeImage
                    src={activeImage}
                    alt="Review attachment"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                {imgs.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((activeIndex - 1 + imgs.length) % imgs.length)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((activeIndex + 1) % imgs.length)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="text-slate-500">No Image Attached</div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
              {imgs.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                    activeIndex === idx ? 'border-cyan-400' : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  <SafeImage src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Info */}
        <div className="md:w-1/2 p-8 flex flex-col overflow-y-auto custom-scrollbar bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-6 pr-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shrink-0 overflow-hidden">
              {review.author?.profilePictureUrl ? (
                <SafeImage
                  src={review.author.profilePictureUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <div>
              <div className="font-bold text-white text-lg">
                {review.author?.displayName || 'Verified Buyer'}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
            {review.comment}
          </div>

          {review.product && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Reviewed Product
              </div>
              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {review.product.images?.[0] && (
                  <SafeImage
                    src={review.product.images[0]}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="font-medium text-slate-200 line-clamp-2 text-sm">
                  {review.product.title}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
