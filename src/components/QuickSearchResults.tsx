import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuickSearchResults({ search, onSelectProduct }: { search: string, onSelectProduct: (p: any) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['quickSearch', search],
    queryFn: async () => {
      const res = await fetch(`/api-v2/products/public?q=${encodeURIComponent(search)}&limit=8`);
      if (!res.ok) return { products: [] };
      return res.json();
    },
    enabled: !!search
  });

  if (!search) return null;

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 mb-16 px-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Search Results for "{search}"
        </h3>
        <Link to={`/marketplace?q=${encodeURIComponent(search)}`} className="text-sm font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          View all results <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div></div>
      ) : data?.products?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.products.map((p: any) => {
            let images = [];
            try { images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch(e) {}
            return (
              <div key={p.id} onClick={() => onSelectProduct(p)} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group h-full">
                <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-slate-950 flex items-center justify-center">
                  {images[0] ? (
                    <img src={images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-700" />
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-semibold text-slate-200 text-sm line-clamp-2">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate mt-1">
                    {p.seller?.companyName || 'Verified Seller'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/5">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No results found for "{search}".</p>
        </div>
      )}
    </div>
  );
}
