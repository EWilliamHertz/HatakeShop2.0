import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Search, MapPin, BadgeCheck, ShieldCheck, UserPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function Suppliers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  
  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationFn: async (targetId: number) => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Must be logged in to connect");
      const res = await fetch(`/api-v2/company/${targetId}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
      });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Connection updated!");
      queryClient.invalidateQueries({ queryKey: ['publicPartners'] });
    }
  });

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
              {partner.profilePictureUrl ? (
                <img src={partner.profilePictureUrl} alt={partner.name} className="w-16 h-16 rounded-full object-cover mb-4 group-hover:scale-110 transition-transform border border-slate-700 shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform border border-slate-700 group-hover:bg-cyan-500 group-hover:text-slate-900">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5 mb-2">
                {partner.name}
                {partner.verificationStatus === 'verified' && <span title="Verified"><BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" /></span>}
                {partner.verificationStatus === 'audited' && <span title="Audited"><ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /></span>}
              </h3>
              
              <div className="mb-3">
                {partner.signedUp || !partner.isLeadOnly ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Joined')}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Invited')}</span>
                )}
              </div>
              
              <div className="flex flex-col items-center justify-center text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700 w-full mb-2">
                <div className="flex flex-col items-center text-slate-200 text-center">
                  <span className="uppercase tracking-wider text-xs font-bold flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-cyan-500 shrink-0" /> 
                    {partner.location || 'GLOBAL'}{partner.region ? ',' : ''}
                  </span>
                  {partner.region && (
                    <span className="uppercase tracking-widest text-xs font-semibold text-slate-400 mt-0.5">
                      {partner.region}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full mt-auto pt-4 border-t border-slate-700/50 flex flex-col space-y-2 text-left">
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{t('Focus')}</span>
                   <span className="text-sm font-medium text-slate-300">{partner.companyFocus || t('Trading Cards & Games')}</span>
                 </div>
                 <div className="flex justify-between items-center mt-2">
                   <div className="flex flex-col">
                     <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{t('Platform Sales')}</span>
                     <span className="text-xs font-semibold text-emerald-400">TBD</span>
                   </div>
                   {partner.id && (
                     <div className="text-cyan-400 text-sm font-bold group-hover:text-cyan-300 flex items-center">
                       {t('Profile')} <span className="ml-1">→</span>
                     </div>
                   )}
                 </div>
              </div>
              <button 
                  onClick={(e) => { e.preventDefault(); followMutation.mutate(partner.id); }}
                  className="mt-4 w-full py-2 bg-slate-950 border border-slate-700 text-slate-300 rounded-lg text-sm font-bold hover:bg-cyan-900/30 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Connect
                </button>
              </Wrapper>
          )})}
        </div>
      )}
    </div>
  );
}
