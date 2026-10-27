import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronRight, ArrowRight, BadgeCheck, Layers, Filter as FilterIcon, Sparkles } from 'lucide-react';

export const BROWSE_PREVIEW_COUNT = 4;

const COUNTRY_FLAGS: Record<string, string> = {
  'China': '🇨🇳',
  'Italy': '🇮🇹',
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'Sweden': '🇸🇪',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'United Kingdom': '🇬🇧',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',
  'Spain': '🇪🇸',
};

const flagFor = (country?: string | null) => (country && COUNTRY_FLAGS[country]) || '🌐';

const previewGrid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 w-full';

const ExploreTile = ({
  onClick,
  to,
  label,
  sub,
  count,
}: {
  onClick?: () => void;
  to?: string;
  label: string;
  sub?: string;
  count?: number;
}) => {
  const inner = (
    <div className="relative flex flex-col items-center justify-center text-center p-6 h-full min-h-[280px] w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.12),transparent_70%)] opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="relative w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300 shadow-lg shadow-cyan-950/40">
        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <span className="relative text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
        {label}
      </span>
      {sub && (
        <span className="relative text-xs text-slate-400 mt-1 max-w-[180px] truncate">
          {sub}
        </span>
      )}
      {typeof count === 'number' && count > 0 && (
        <span className="relative mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
          {count} wholesale SKUs
        </span>
      )}
    </div>
  );

  const cls =
    'group bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-dashed border-slate-700/80 hover:border-cyan-500/50 transition-all duration-300 flex cursor-pointer';

  return to ? (
    <Link to={to} onClick={() => window.scrollTo(0, 0)} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
};

export function BrowseSections({
  categories = [],
  companies = [],
  renderCard,
  onViewCategory,
  onSelectSupplier,
}: {
  categories?: any[];
  companies?: any[];
  renderCard: (product: any, index: number) => React.ReactNode;
  onViewCategory: (categoryId: number) => void;
  onSelectSupplier?: (sellerId: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      {/* Curated Category Rows */}
      {(categories || []).map((cat: any) => {
        const items = (cat.products || []).slice(0, BROWSE_PREVIEW_COUNT);
        const showExploreTile = items.length < BROWSE_PREVIEW_COUNT && (cat.productCount || 0) > items.length;
        return (
          <section
            key={cat.id}
            className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl shadow-black/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500 shrink-0" />
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                    {cat.name}
                  </h3>
                  <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full tabular-nums">
                    {cat.productCount} {cat.productCount === 1 ? t('listing') : t('listings')}
                  </span>
                </div>

                {(cat.subcategories || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {(cat.subcategories || []).map((sub: any) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onViewCategory(sub.id)}
                        className="group inline-flex items-center gap-1.5 text-xs bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white px-3 py-1 rounded-full font-medium transition-all"
                      >
                        <span className="text-cyan-400 font-bold">#</span>
                        <span>{sub.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-300 bg-slate-800/90 px-1.5 py-0.2 rounded-full tabular-nums">
                          {sub.productCount || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onViewCategory(cat.id)}
                className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 hover:border-cyan-400/50 text-xs font-bold uppercase tracking-wider transition-all group"
              >
                <span>{t('View Category')}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className={previewGrid}>
              {items.map((p: any, i: number) => (
                <React.Fragment key={p?.id ?? `cat-${cat.id}-${i}`}>
                  {renderCard(p, i)}
                </React.Fragment>
              ))}
              {showExploreTile && (
                <ExploreTile
                  onClick={() => onViewCategory(cat.id)}
                  label={t('Explore Category')}
                  sub={cat.name}
                  count={cat.productCount}
                />
              )}
            </div>
          </section>
        );
      })}

      {/* Verified Supplier Showrooms */}
      {(companies || []).length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                {t('Direct Manufacturer & Distributor Network')}
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-cyan-400" />
                {t('Verified Supplier Showrooms')}
              </h2>
            </div>
            <Link
              to="/suppliers"
              className="text-xs font-bold text-slate-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
            >
              {t('Browse Full Partner Directory')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-8">
            {companies.map((co: any) => {
              const items = (co.products || []).slice(0, BROWSE_PREVIEW_COUNT);
              return (
                <section
                  key={co.sellerId}
                  className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 sm:p-6 rounded-3xl border border-slate-800 hover:border-slate-700/90 transition-colors space-y-5 shadow-xl shadow-black/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link
                        to={`/company/${co.sellerId}`}
                        className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 shrink-0 hover:border-cyan-500/50 transition-colors shadow-inner"
                      >
                        <Building2 className="w-6 h-6 text-cyan-400" />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={`/company/${co.sellerId}`}
                          className="text-lg sm:text-xl font-extrabold text-white hover:text-cyan-300 transition-colors flex items-center gap-2 truncate"
                        >
                          <span className="truncate">{co.companyName || 'Supplier'}</span>
                          {co.verificationStatus === 'verified' && (
                            <BadgeCheck className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                          )}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                          {co.country && (
                            <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                              <span>{flagFor(co.country)}</span>
                              <span>{co.country}</span>
                            </span>
                          )}
                          <span>•</span>
                          <span className="font-semibold text-cyan-300/90 tabular-nums">
                            {co.productCount} {co.productCount === 1 ? 'active SKU' : 'active SKUs'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {onSelectSupplier && (
                        <button
                          type="button"
                          onClick={() => onSelectSupplier(co.sellerId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold transition-all"
                        >
                          <FilterIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t('Filter in Catalog')}</span>
                        </button>
                      )}
                      <Link
                        to={`/company/${co.sellerId}/listings`}
                        onClick={() => window.scrollTo(0, 0)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider transition-all group"
                      >
                        <span>{t('Full Showroom')}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  <div className={previewGrid}>
                    {items.map((p: any, i: number) => (
                      <React.Fragment key={p?.id ?? `co-${co.sellerId}-${i}`}>
                        {renderCard(p, i)}
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
