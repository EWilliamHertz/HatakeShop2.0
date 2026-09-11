import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, PackageSearch, Filter, MapPin, Building2, Package, Tag, X, ChevronRight, ChevronLeft, Star, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DigitalSlab } from '../components/DigitalSlab.tsx';
import { useAuth } from '../components/AuthContext.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { cn } from '../components/Layout.tsx';
import { useCurrency } from '../components/CurrencyContext.tsx';
import { LandedCostEstimator } from '../components/LandedCostEstimator.tsx';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const generatePriceTrend = (basePrice: number) => {
  return Array.from({ length: 90 }, (_, i) => {
    const daysAgo = 90 - i;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const volatility = 0.05;
    const noise = (Math.random() - 0.5) * volatility * basePrice;
    const price = Math.max(0, basePrice + noise + (Math.sin(i / 10) * basePrice * 0.02));
    const quantity = Math.floor(Math.random() * 500) + 50;
    return { date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), price: Number(price.toFixed(2)), quantity };
  });
};

const CardImageCarousel = ({ images, title }: { images: string[], title: string }) => {
  const [idx, setIdx] = React.useState(0);
  if (!images || images.length === 0) return <div className="w-full h-full flex items-center justify-center"><PackageSearch className="w-10 h-10 text-slate-400" /></div>;
  const handlePrev = (e: any) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const handleNext = (e: any) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };
  return <div className="relative w-full h-full"><img src={images[idx]} alt={title} className="w-full h-full object-cover" />{images.length > 1 && <><button type="button" onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white"><ChevronLeft className="w-4 h-4" /></button><button type="button" onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white"><ChevronRight className="w-4 h-4" /></button></>}</div>;
};

type HomeData = { products?: any[]; companies?: any[]; categories?: any[]; stats?: any };

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { convertPrice } = useCurrency();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showEstimator, setShowEstimator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data = {}, isLoading, error } = useQuery<HomeData>({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await fetch('/api/home');
      if (!response.ok) throw new Error(`Failed to load home data (${response.status})`);
      return response.json();
    },
  });

  const products = Array.isArray(data.products) ? data.products : [];
  const companies = Array.isArray(data.companies) ? data.companies : [];
  const filteredProducts = products.filter((product: any) => !searchTerm || String(product?.name ?? product?.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">{t('home.eyebrow', 'B2B TCG wholesale marketplace')}</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{t('home.title', 'Source trading cards with confidence.')}</h1>
            <p className="mt-6 text-lg text-slate-300">{t('home.subtitle', 'Connect with verified suppliers, compare inventory, and build dependable wholesale relationships.')}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/marketplace" className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">{t('home.browse', 'Browse marketplace')}</Link>{!user && <Link to="/login" className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">{t('home.join', 'Join Hatake')}</Link>}</div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">{t('home.featuredLabel', 'Featured inventory')}</p><h2 className="mt-1 text-3xl font-bold text-slate-900">{t('home.featuredTitle', 'Products ready for sourcing')}</h2></div><div className="flex items-center gap-2"><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('home.search', 'Search products')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><Link to="/marketplace" className="text-sm font-semibold text-emerald-700">{t('home.viewAll', 'View all')}</Link></div></div>
        {error && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">{t('home.loadError', 'Some live inventory could not be loaded right now.')}</div>}
        {isLoading ? <div className="rounded-xl bg-white p-10 text-center text-slate-500">{t('common.loading', 'Loading...')}</div> : filteredProducts.length === 0 ? <div className="rounded-xl bg-white p-10 text-center text-slate-500">{t('home.noProducts', 'No products are available yet.')}</div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{filteredProducts.slice(0, 12).map((product: any) => { const id = product?.id ?? product?.productId; const title = product?.name ?? product?.title ?? 'Product'; const price = Number(product?.price ?? 0); const images = Array.isArray(product?.images) ? product.images : []; if (id == null) return null; return <article key={id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><div className="aspect-[4/3] bg-slate-100"><CardImageCarousel images={images} title={title} /></div><div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{title}</h3><span className="text-sm font-semibold text-emerald-700">{convertPrice(price)}</span></div><p className="mt-2 line-clamp-2 text-sm text-slate-500">{product?.description ?? 'Wholesale trading-card inventory'}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => { setSelectedProduct(product); setShowEstimator(true); }} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Estimate landed cost</button><button type="button" onClick={() => addToCart(product)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Add</button></div></div></article>; })}</div>}
        <section className="mt-16"><div className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">{t('home.companiesLabel', 'Supplier network')}</p><h2 className="mt-1 text-3xl font-bold text-slate-900">{t('home.companiesTitle', 'Meet the companies behind the inventory')}</h2></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{companies.slice(0, 6).map((company: any) => { const id = company?.id; if (id == null) return null; return <Link key={id} to={`/company/${id}`} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-emerald-600" /><div><h3 className="font-semibold text-slate-900">{company?.name ?? 'Company'}</h3><p className="text-sm text-slate-500">{company?.country ?? company?.location ?? 'International supplier'}</p></div></div></Link>; })}</div></section>
        {showEstimator && selectedProduct && <LandedCostEstimator product={selectedProduct} onClose={() => setShowEstimator(false)} />}
      </main>
    </div>
  );
}
