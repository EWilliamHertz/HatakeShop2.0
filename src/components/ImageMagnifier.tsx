import React, { useState } from 'react';

export function ImageMagnifier({ src, alt }: { src: string, alt: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setPosition({ x, y });
    setCursorPosition({ x: e.pageX - left, y: e.pageY - top });
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden group cursor-crosshair"
      onMouseEnter={() => setShowMagnifier(true)}
      onMouseLeave={() => setShowMagnifier(false)}
      onMouseMove={handleMouseMove}
    >
      <img src={src} alt={alt} className="w-full h-full object-contain" />
      
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
