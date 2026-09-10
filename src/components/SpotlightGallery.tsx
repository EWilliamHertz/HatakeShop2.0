import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  companyName: string;
}

export function SpotlightGallery({ isOpen, onClose, images, companyName }: SpotlightGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setPosition({ x, y });
  };

  const displayImages = [...images];
  while (displayImages.length < 50 && displayImages.length > 0) {
    displayImages.push(...images);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const downloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(companyName || 'Company').replace(/\s+/g, '_')}_Asset_${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center"
          onMouseMove={handleMouseMove}
          ref={containerRef}
        >
          <div className="absolute top-0 left-0 right-0 p-6 z-[101] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
            <div>
              <h2 className="text-white text-2xl font-black tracking-tight">{companyName || 'Company'} Spotlight</h2>
              <p className="text-white/70 text-sm font-medium mt-1">Interactive Asset Gallery ({displayImages.length} Resources)</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-slate-800/10 hover:bg-slate-800/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          
          <motion.div 
            className="absolute"
            style={{
              width: '300vw',
              height: '300vh',
              left: `-${position.x * 200}vw`,
              top: `-${position.y * 200}vh`,
              transition: 'left 0.8s ease-out, top 0.8s ease-out'
            }}
          >

            <div className="w-full h-full p-8 md:p-24 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 md:gap-8 auto-rows-fr">
              {displayImages.map((img, idx) => {
                const spanClass = idx % 7 === 0 ? 'col-span-2 row-span-2' : idx % 11 === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1';
                return (
                  <div 
                    key={idx} 
                    className={`group relative rounded-xl overflow-hidden bg-slate-800/5 border border-white/10 ${spanClass}`}
                  >
                    <img 
                      src={img} 
                      alt={`Asset ${idx}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
                        className="p-3 bg-slate-800 text-black rounded-full hover:scale-110 transition-transform shadow-2xl z-[102]"
                        title="Download Asset"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 pointer-events-none z-[101]">
            <p className="text-white/70 text-sm font-medium flex items-center">
              <Maximize2 className="w-4 h-4 mr-2" /> Move your cursor to explore the gallery
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
