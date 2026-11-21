import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, Grid, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeImage } from './SafeImage.tsx';

export interface GalleryAssetItem {
  url: string;
  title?: string;
  category?: string;
}

interface SpotlightGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  companyName: string;
  items?: GalleryAssetItem[];
}

export function SpotlightGallery({
  isOpen,
  onClose,
  images,
  companyName,
  items,
}: SpotlightGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const touchStartX = React.useRef<number | null>(null);

  const normalizedAssets: GalleryAssetItem[] = useMemo(() => {
    const seen = new Set<string>();
    const list: GalleryAssetItem[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item?.url || seen.has(item.url)) continue;
        seen.add(item.url);
        list.push(item);
      }
    }
    for (const url of images || []) {
      if (!url || typeof url !== 'string' || seen.has(url)) continue;
      seen.add(url);
      list.push({ url, title: companyName || 'Company Asset', category: 'Products' });
    }
    return list;
  }, [images, items, companyName]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of normalizedAssets) {
      const cat = a.category || 'Products';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [normalizedAssets]);

  const filteredAssets = useMemo(() => {
    if (activeCategory === 'all') return normalizedAssets;
    return normalizedAssets.filter((a) => (a.category || 'Products') === activeCategory);
  }, [normalizedAssets, activeCategory]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(null);
      setActiveCategory('all');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeIndex !== null) setActiveIndex(null);
        else onClose();
      } else if (e.key === 'ArrowRight' && activeIndex !== null && filteredAssets.length > 0) {
        setActiveIndex((prev) => ((prev ?? 0) + 1) % filteredAssets.length);
      } else if (e.key === 'ArrowLeft' && activeIndex !== null && filteredAssets.length > 0) {
        setActiveIndex((prev) => ((prev ?? 0) - 1 + filteredAssets.length) % filteredAssets.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredAssets.length, onClose]);

  const downloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(companyName || 'Company').replace(/\s+/g, '_')}_Asset_${Date.now()}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  const currentLightboxAsset =
    activeIndex !== null && filteredAssets[activeIndex] ? filteredAssets[activeIndex] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col theme-keep-dark"
        >
          {/* Top Header Bar */}
          <div className="px-4 sm:px-8 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white text-lg sm:text-xl font-black tracking-tight">
                  {companyName || 'Company'} — Media Gallery
                </h2>
                <p className="text-white/60 text-xs font-medium">
                  {filteredAssets.length} {filteredAssets.length === 1 ? 'photo' : 'photos'} · Tap any image to view fullscreen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeIndex !== null && (
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Grid className="w-4 h-4" />
                  <span>Back to Grid</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close gallery"
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills inside Gallery */}
          {categories.length > 1 && activeIndex === null && (
            <div className="px-4 sm:px-8 py-3 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar bg-black/40 shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                All Photos ({normalizedAssets.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat.name
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          )}

          {/* Body: Either Fullscreen Lightbox Carousel or Scrollable Responsive Photo Grid */}
          {currentLightboxAsset && activeIndex !== null ? (
            <div
              className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-hidden"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null || filteredAssets.length <= 1) return;
                const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(deltaX) > 40) {
                  if (deltaX < 0) setActiveIndex((activeIndex + 1) % filteredAssets.length);
                  else setActiveIndex((activeIndex - 1 + filteredAssets.length) % filteredAssets.length);
                }
              }}
            >
              {filteredAssets.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() =>
                      setActiveIndex((activeIndex - 1 + filteredAssets.length) % filteredAssets.length)
                    }
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setActiveIndex((activeIndex + 1) % filteredAssets.length)}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <div className="max-w-5xl max-h-[72vh] w-full h-full flex items-center justify-center">
                <SafeImage
                  src={currentLightboxAsset.url}
                  alt={currentLightboxAsset.title || 'Gallery photo'}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 max-w-3xl w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3">
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm truncate">
                    {currentLightboxAsset.title || companyName}
                  </div>
                  <div className="text-white/60 text-xs">
                    Photo {activeIndex + 1} of {filteredAssets.length}
                    {currentLightboxAsset.category ? ` • ${currentLightboxAsset.category}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadImage(currentLightboxAsset.url)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              {filteredAssets.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/60 text-sm">
                  No gallery images available for this supplier yet.
                </div>
              ) : (
                <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
                  {filteredAssets.map((asset, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.015, 0.25) }}
                      key={asset.url + idx}
                      onClick={() => setActiveIndex(idx)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-400/70 cursor-pointer flex flex-col"
                    >
                      <SafeImage
                        src={asset.url}
                        alt={asset.title || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(asset.url);
                            }}
                            title="Download photo"
                            className="w-8 h-8 rounded-full bg-black/60 hover:bg-cyan-500 text-white hover:text-slate-950 flex items-center justify-center transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-xs font-bold truncate">
                            {asset.title || `Photo ${idx + 1}`}
                          </span>
                          <ZoomIn className="w-4 h-4 text-cyan-400 shrink-0" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
