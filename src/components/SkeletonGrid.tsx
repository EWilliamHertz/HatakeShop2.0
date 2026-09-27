import React from 'react';

export function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full justify-start place-items-stretch">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 flex flex-col min-h-[350px]">
          <div className="w-full aspect-square bg-slate-800 rounded-xl mb-4 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-3/4 mb-3 animate-pulse"></div>
          <div className="h-3 bg-slate-800 rounded w-1/2 mb-4 animate-pulse"></div>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="h-6 bg-slate-800 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
