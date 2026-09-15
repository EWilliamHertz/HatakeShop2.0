import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Search, MapPin, BadgeCheck, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Suppliers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['publicPartners'],
    queryFn: async () => {
      const res = await fetch('/api-v2/public/partners');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  // Only show actual signed-up platform users, not pending leads
  const filteredPartners = partners.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col items-center text-center space-y-4 mb-12">
        <h1 className="heading-xl">{t('Verified Supplier Directory')}</h1>
        <p className="text-slate-400 max-w-2xl">{t('Browse our network of vetted international TCG distributors, OEM manufacturers, and retail partners.')}</p>
        
        <div className="relative w-full max-w-md mt-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder={t('Search companies...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('Loading network...')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPartners.map((partner: any, idx: number) => {
            const Wrapper: any = partner.id ? Link : 'div';
            return (
            <Wrapper 
              to={partner.id ? `/company/${partner.id}` : undefined} 
              key={idx}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform border border-slate-700 group-hover:bg-cyan-500 group-hover:text-slate-900">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5 mb-2">
                {partner.name}
                {partner.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" title="Verified" />}
                {partner.verificationStatus === 'audited' && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Audited" />}
              </h3>
              
              <div className="mb-3">
                {partner.signedUp || !partner.isLeadOnly ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Joined')}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Invited')}</span>
                )}
              </div>
              <div className="flex items-center text-sm font-medium text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> {partner.location || 'Global'}
              </div>
              {partner.id && (
                <div className="mt-4 text-cyan-400 text-sm font-semibold group-hover:text-cyan-300 flex items-center">
                  View Profile <span className="ml-1">→</span>
                </div>
              )}
            </Wrapper>
          )})}
        </div>
      )}
    </div>
  );
}
