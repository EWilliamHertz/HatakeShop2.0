import React, { useState, useEffect } from 'react';
import { PackageSearch } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  containerClassName?: string;
}

export function SafeImage({
  src,
  alt,
  fallbackIcon,
  fallbackText,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  loading = 'lazy',
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // If no source or failed to load, render sleek fallback
  if (!src || hasError) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600 select-none ${containerClassName}`}>
        {fallbackIcon || <PackageSearch className="w-8 h-8 text-slate-600" />}
        {fallbackText && (
          <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-500">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
      {...props}
    />
  );
}
