import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe2, Building2, Clock } from 'lucide-react';

export function Leads() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads-public'],
    queryFn: async () => {
      const res = await fetch('/api-v2/leads/public');
      if (!res.ok) return { leads: [], total: 0 };
      return res.json();
    },
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const { data: progress = { sentCount: 0, totalGoal: 0 } } = useQuery({
    queryKey: ['leadsProgress'],
    queryFn: async () => {
      try {
        const res = await fetch('/api-v2/leads/progress');
        const json = await res.json();
        return json && typeof json.sentCount === 'number' ? json : { sentCount: 0, totalGoal: 0 };
      } catch { return { sentCount: 0, totalGoal: 0 }; }
    },
    refetchInterval: 15000,
  });

  const leads: any[] = data?.leads || [];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24">
      <Helmet>
        <title>Launch Ledger — Hatake</title>
        <meta name="description" content="Watch Hatake's verified B2B outreach ledger grow in real-time as we onboard TCG companies ahead of our October 1st launch." />
      </Helmet>

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-20 pb-12">

        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Live — Refreshes every 15 seconds
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            Launch Ledger
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every day, we reach out to <strong className="text-white">50 verified TCG companies</strong> across the globe — wholesalers, distributors, and manufacturers — and invite them to join our enterprise network.
            Invitations begin <strong className="text-white">October 1st, 2026</strong>.
          </p>

          {/* Counter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-3xl font-black text-white tabular-nums">{progress.sentCount.toLocaleString()}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Companies Reached</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-3xl font-black text-cyan-400">50/day</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Daily Target</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-3xl font-black text-indigo-400">Oct 1</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Launch Date</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Outreach Progress</span>
              <span>{progress.sentCount.toLocaleString()} / {progress.totalGoal.toLocaleString()}</span>
            </div>
            <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(1, Math.min(100, (progress.sentCount / progress.totalGoal) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-10 text-sm text-amber-300 flex gap-3">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Privacy Notice:</strong> Company names are anonymised below. We display only the domain (website) of companies we have reached out to. We respect GDPR and CCPA — invited companies may request removal at any time.
          </div>
        </div>

        {/* Leads Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
          </div>
        ) : leads.length > 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                   <tr>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Company</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Website</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Location</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Socials</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/60">
                   {leads.map((lead: any, idx: number) => (
                     <tr key={lead.id || idx} className="hover:bg-white/5 transition-colors group">
                       <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                           <Building2 className="w-4 h-4 text-slate-400" />
                         </div>
                         {lead.companyName}
                       </td>
                       <td className="px-6 py-4">
                         {lead.website ? (
                           <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                             {lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 opacity-50"/>
                           </a>
                         ) : <span className="text-slate-600">-</span>}
                       </td>
                       <td className="px-6 py-4 text-slate-400">
                         {lead.location || <span className="text-slate-600">-</span>}
                       </td>
                       <td className="px-6 py-4">
                         {lead.socialLinks && lead.socialLinks.length > 0 ? (
                           <div className="flex gap-2">
                             {lead.socialLinks.map((link:string, i:number) => (
                               <a key={i} href={link} target="_blank" rel="noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors">
                                 Link
                               </a>
                             ))}
                           </div>
                         ) : <span className="text-slate-600">-</span>}
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${
                            lead.status === 'registered' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' :
                            lead.status === 'responded' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-800/80 text-slate-400 border border-slate-700'
                          }`}>
                            {lead.status === 'registered' ? '✓ Joined' : lead.status === 'responded' ? '↩ Responded' : 'Invited'}
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Building2 className="w-14 h-14 mx-auto text-slate-700" />
            <h3 className="text-xl font-bold text-white">Outreach launches October 1st</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              The ledger will begin filling up when our outreach campaign kicks off. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}