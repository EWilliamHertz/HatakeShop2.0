import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CategorySEOPage() {
  const { categorySlug } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch products by category slug
    fetch(`/api-v2/seo/category/${categorySlug}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [categorySlug]);

  if (!data) return <div className="pt-32 text-center text-slate-400">Loading...</div>;

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <Helmet>
        <title>{`Wholesale ${data.categoryName || categorySlug} | B2B Suppliers | Hatake.Shop`}</title>
        <meta name="description" content={`Source high-quality wholesale ${data.categoryName || categorySlug} directly from verified B2B suppliers on Hatake.Shop. Request bulk quotes today.`} />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white capitalize mb-4">
          Wholesale {data.categoryName || categorySlug.replace(/-/g, ' ')}
        </h1>
        <p className="text-slate-400 text-lg max-w-3xl">
          Browse our curated list of verified suppliers and products in the {data.categoryName || categorySlug.replace(/-/g, ' ')} category. Get direct factory pricing and secure escrow protection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.products?.map((p: any) => (
          <Link to={`/products/${p.id}`} key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-colors">
            <div className="aspect-square bg-slate-800 relative">
              {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" /> : <Package className="w-12 h-12 text-slate-600 absolute inset-0 m-auto" />}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white truncate">{p.title}</h3>
              <div className="text-sm text-cyan-400 mt-2 font-mono">From €{Number(p.unitCost).toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {p.seller?.country || 'Global'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
