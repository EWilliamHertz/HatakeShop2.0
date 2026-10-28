import React, { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { optimizeImageUrl } from './SafeImage.tsx';

export function ImageMagnifier({ src, alt }: { src: string, alt: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hasError, setHasError] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setPosition({ x, y });
    setCursorPosition({ x: e.pageX - left, y: e.pageY - top });
  };

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950 p-6 select-none">
        <PackageSearch className="w-16 h-16 text-slate-600 mb-2" />
        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Preview Unavailable</span>
      </div>
    );
  }

  const displaySrc = optimizeImageUrl(src, 1200);

  return (
    <div 
      className="relative w-full h-full overflow-hidden group cursor-crosshair flex items-center justify-center"
      onMouseEnter={() => setShowMagnifier(true)}
      onMouseLeave={() => setShowMagnifier(false)}
      onMouseMove={handleMouseMove}
    >
      <img
        src={displaySrc}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain"
      />
      
      {showMagnifier && (
        <div 
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundSize: '250%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0f172a' // slate-900
          }}
        />
      )}
    </div>
  );
}
