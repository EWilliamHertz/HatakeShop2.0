import React, { useState, useEffect } from 'react';
import { PackageSearch } from 'lucide-react';

/**
 * Transforms heavy camera raw / full-size image URLs into fast, compressed WebP
 * thumbnails via the backend image proxy.
 */
export function optimizeImageUrl(src?: string | null, width = 600): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.endsWith('.svg') ||
    trimmed.includes('/api-v2/image-proxy') ||
    trimmed.includes('/image-proxy')
  ) {
    return trimmed;
  }
  return `/api-v2/image-proxy?url=${encodeURIComponent(trimmed)}&w=${width}`;
}

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  containerClassName?: string;
  optimize?: boolean;
  targetWidth?: number;
}

export function SafeImage({
  src,
  alt,
  fallbackIcon,
  fallbackText,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  loading = 'lazy',
  optimize = true,
  targetWidth = 600,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [triedRaw, setTriedRaw] = useState(false);

  useEffect(() => {
    setHasError(false);
    setTriedRaw(false);
  }, [src]);

  // If no source or failed to load after both optimized and raw attempts
  if (!src || (hasError && (triedRaw || !optimize))) {
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

  const effectiveSrc = optimize && !triedRaw ? optimizeImageUrl(src, targetWidth) : src;

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => {
        if (optimize && !triedRaw) {
          // If optimized proxy failed, fallback once to the raw unoptimized URL
          setTriedRaw(true);
        } else {
          setHasError(true);
        }
      }}
      className={className}
      {...props}
    />
  );
}
