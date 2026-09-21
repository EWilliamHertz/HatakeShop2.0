import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronRight, ArrowRight, BadgeCheck } from 'lucide-react';

/**
 * "All Categories" browse layout shared by the Marketplace and the Home page:
 * - one row per category: a few products (mixed suppliers) + a "View more" button
 * - one row per company (A-Z): a few products + an arrow to view more of their products
 */

export const BROWSE_PREVIEW_COUNT = 4;

const previewGrid = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full';

const MoreTile = ({ onClick, to, label, sub, icon }: { onClick?: () => void; to?: string; label: string; sub?: string; icon: React.ReactNode }) => {
  const content = (
    <>
      <span className="w-14 h-14 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center border border-slate-700 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all duration-300">
        {icon}
      </span>
      <span className="text-xs font-bold tracking-wider uppercase">{label}</span>
      {sub && <span className="text-[10px] text-slate-500 mt-1 truncate max-w-[160px]">{sub}</span>}
    </>
  );
  const cls = 'group bg-slate-900/50 rounded-2xl border border-slate-800/60 hover:border-cyan-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-900/20 transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6 cursor-pointer';
  return to ? (
    <Link to={to} onClick={() => window.scrollTo(0, 0)} className={cls}>{content}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{content}</button>
  );
};

export function BrowseSections({ categories = [], companies = [], renderCard, onViewCategory }: {
  categories?: any[];
  companies?: any[];
  renderCard: (product: any, index: number) => React.ReactNode;
  onViewCategory: (categoryId: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-14">
      {(categories || []).map((cat: any) => (
        <div key={cat.id} className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-2xl font-bold tracking-tight text-slate-200">{cat.name}</h3>
              <span className="text-sm text-slate-500 shrink-0">{cat.productCount} products</span>
            </div>
            {(cat.subcategories || []).length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {(cat.subcategories || []).map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => onViewCategory(sub.id)}
                    className="group flex items-center text-[13px] bg-slate-900 border border-slate-800 text-slate-400 px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white active:scale-95"
                  >
                    <span className="text-cyan-500/70 group-hover:text-cyan-400 mr-1.5 font-semibold tracking-tight">#</span>
                    {sub.name}
                    <span className="ml-2 text-[11px] font-semibold tracking-tight bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700 px-1.5 py-0.5 rounded-lg transition-colors">{sub.productCount || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={previewGrid}>
            {(cat.products || []).slice(0, BROWSE_PREVIEW_COUNT).map((p: any, i: number) => (
              <React.Fragment key={p?.id ?? `cat-${cat.id}-${i}`}>{renderCard(p, i)}</React.Fragment>
            ))}
            <MoreTile
              onClick={() => onViewCategory(cat.id)}
              label={t('View more')}
              sub={cat.name}
              icon={<ChevronRight className="w-6 h-6" />}
            />
          </div>
        </div>
      ))}

      {(companies || []).length > 0 && (
        <div className="space-y-8">
          {companies.map((co: any) => (
            <div key={co.sellerId} className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 w-full">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <Link to={`/company/${co.sellerId}`} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shrink-0 hover:border-cyan-500/50 transition-colors">
                    <Building2 className="w-6 h-6 text-slate-400" />
                  </Link>
                  <div className="min-w-0">
                    <Link to={`/company/${co.sellerId}`} className="text-xl font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2 truncate">
                      <span className="truncate">{co.companyName || 'Supplier'}</span>
                      {co.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" />}
                    </Link>
                    <p className="text-sm text-slate-500">{co.productCount} product{co.productCount !== 1 ? 's' : ''}{co.country ? ` · ${co.country}` : ''}</p>
                  </div>
                </div>
              </div>
              <div className={previewGrid}>
                {(co.products || []).slice(0, BROWSE_PREVIEW_COUNT).map((p: any, i: number) => (
                  <React.Fragment key={p?.id ?? `co-${co.sellerId}-${i}`}>{renderCard(p, i)}</React.Fragment>
                ))}
                <MoreTile
                  to={`/company/${co.sellerId}/listings`}
                  label={t('View All')}
                  sub={co.companyName || 'Supplier'}
                  icon={<ArrowRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
