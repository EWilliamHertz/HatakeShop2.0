import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  Globe2,
  Building2,
  ShieldAlert,
  Search,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Filter,
} from 'lucide-react';
import { parseLeadGeo } from '../lib/leadGeo.ts';

function getCountryFlag(country?: string | null): string {
  const c = (country || '').trim().toLowerCase();
  const map: Record<string, string> = {
    'united states': '🇺🇸',
    usa: '🇺🇸',
    sweden: '🇸🇪',
    germany: '🇩🇪',
    'united kingdom': '🇬🇧',
    uk: '🇬🇧',
    china: '🇨🇳',
    italy: '🇮🇹',
    japan: '🇯🇵',
    france: '🇫🇷',
    spain: '🇪🇸',
    netherlands: '🇳🇱',
    denmark: '🇩🇰',
    norway: '🇳🇴',
    finland: '🇫🇮',
    canada: '🇨🇦',
    australia: '🇦🇺',
    poland: '🇵🇱',
    belgium: '🇧🇪',
    austria: '🇦🇹',
    switzerland: '🇨🇭',
  };
  return map[c] || '🌍';
}

export function Leads() {
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'responded' | 'invited'>('all');
  const [search, setSearch] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leads-public'],
    queryFn: async () => {
      const res = await fetch('/api-v2/leads/public');
      if (!res.ok) throw new Error(`Failed to fetch ledger (${res.status})`);
      return res.json();
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: progress = { sentCount: 0, totalGoal: 0 } } = useQuery({
    queryKey: ['leadsProgress'],
    queryFn: async () => {
      const res = await fetch('/api-v2/leads/progress');
      if (!res.ok) throw new Error('Failed to fetch progress');
      const json = await res.json();
      return json && typeof json.sentCount === 'number' ? json : { sentCount: 0, totalGoal: 0 };
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const leads: any[] = useMemo(() => {
    const raw = Array.isArray(data?.leads) ? data.leads : [];
    return raw.map((l: any) => {
      const geo = parseLeadGeo({
        country: l.country,
        state: l.state,
        city: l.city,
        location: l.location,
        website: l.website,
      });
      return {
        ...l,
        country: geo.country || null,
        state: geo.state || null,
        city: geo.city || null,
        location: geo.location || l.location || null,
      };
    });
  }, [data?.leads]);

  const countryStats = useMemo(() => {
    const counts = new Map<string, number>();
    let unspecified = 0;
    for (const l of leads) {
      const c = (l.country || '').trim();
      if (c) {
        counts.set(c, (counts.get(c) || 0) + 1);
      } else {
        unspecified++;
      }
    }
    const list = Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
    return { list, unspecified };
  }, [leads]);

  const statusCounts = useMemo(() => {
    let registered = 0;
    let responded = 0;
    let invited = 0;
    for (const l of leads) {
      if (l.status === 'registered') registered++;
      else if (l.status === 'responded') responded++;
      else invited++;
    }
    return { all: leads.length, registered, responded, invited };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l: any) => {
      if (selectedCountry !== 'ALL') {
        if (selectedCountry === '__UNSPECIFIED__') {
          if ((l.country || '').trim() !== '') return false;
        } else if ((l.country || '').trim().toLowerCase() !== selectedCountry.toLowerCase()) {
          return false;
        }
      }
      if (statusFilter !== 'all' && l.status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          l.companyName,
          l.website,
          l.country,
          l.city,
          l.state,
          l.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, selectedCountry, statusFilter, search]);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 6);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollIndicators());
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    window.addEventListener('resize', updateScrollIndicators);
    return () => {
      window.removeEventListener('resize', updateScrollIndicators);
      if (ro) ro.disconnect();
    };
  }, [updateScrollIndicators, filteredLeads.length, isLoading]);

  const scrollHorizontally = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const hasActiveFilters = selectedCountry !== 'ALL' || statusFilter !== 'all' || search.trim() !== '';
  const hasHorizontalOverflow = canScrollLeft || canScrollRight;
  const pct = progress.totalGoal > 0 ? Math.max(1, Math.min(100, (progress.sentCount / progress.totalGoal) * 100)) : 1;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-16">
      <Helmet>
        <title>Launch Ledger — Hatake</title>
        <meta
          name="description"
          content="Watch Hatake's verified B2B outreach ledger grow in real-time as we onboard TCG companies ahead of our November 1st launch."
        />
      </Helmet>

      {/* Subtle ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[760px] h-[360px] bg-indigo-600/12 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-10 space-y-4">
        {/* Compact Header + Live Metrics Strip */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 sm:p-5 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live · 15s refresh
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  50 verified TCG companies invited daily · Launch Nov 1, 2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Launch Ledger
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-snug">
                Real-time B2B outreach tracker across wholesalers, distributors, OEM factories, and hobby stores worldwide.
              </p>
            </div>

            {/* Compact 3-stat strip */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-xl font-black text-white tabular-nums leading-tight">
                  {progress.sentCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Reached</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-xl font-black text-cyan-400 leading-tight">50/day</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Target</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-center">
                <div className="text-lg sm:text-xl font-black text-indigo-400 leading-tight">
                  {countryStats.list.length}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Countries</div>
              </div>
            </div>
          </div>

          {/* Slim outreach progress bar + compact GDPR line */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Outreach Progress</span>
                <span className="tabular-nums font-semibold text-slate-300">
                  {progress.sentCount.toLocaleString()} / {progress.totalGoal.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>
                <strong>GDPR/CCPA:</strong> Public ledger shows business domains &amp; locations only; removal available anytime.
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar: Country Pills + Search + Country Select + Status Filter */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-xl space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Search input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, domain, city, or country..."
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Country dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[170px]">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  aria-label="Filter by country"
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">All Countries ({leads.length})</option>
                  {countryStats.list.map(({ country, count }) => (
                    <option key={country} value={country}>
                      {getCountryFlag(country)} {country} ({count})
                    </option>
                  ))}
                  {countryStats.unspecified > 0 && (
                    <option value="__UNSPECIFIED__">Unspecified ({countryStats.unspecified})</option>
                  )}
                </select>
              </div>

              {/* Status segmented pills */}
              <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {([
                  { key: 'all', label: 'All', count: statusCounts.all },
                  { key: 'registered', label: 'Joined', count: statusCounts.registered },
                  { key: 'responded', label: 'Responded', count: statusCounts.responded },
                  { key: 'invited', label: 'Invited', count: statusCounts.invited },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}{' '}
                    <span className={statusFilter === tab.key ? 'text-slate-900/80' : 'text-slate-500'}>
                      ({tab.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Country Filter Pills */}
          {countryStats.list.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Country:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCountry('ALL')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  selectedCountry === 'ALL'
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                🌍 All ({leads.length})
              </button>
              {countryStats.list.map(({ country, count }) => {
                const active = selectedCountry.toLowerCase() === country.toLowerCase();
                return (
                  <button
                    key={country}
                    type="button"
                    onClick={() => setSelectedCountry(active ? 'ALL' : country)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{getCountryFlag(country)}</span>
                    <span>{country}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">({count})</span>
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCountry('ALL');
                    setStatusFilter('all');
                    setSearch('');
                  }}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  <X className="w-3 h-3" /> Reset filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ledger Table */}
        {isLoading ? (
          <div className="flex justify-center py-14">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        ) : leads.length > 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
            {/* Table meta bar + explicit horizontal scroll hint & controls */}
            <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-300 font-medium">
                Showing <span className="font-bold text-white tabular-nums">{filteredLeads.length}</span> of{' '}
                <span className="tabular-nums text-slate-400">{leads.length}</span> companies
                {selectedCountry !== 'ALL' && selectedCountry !== '__UNSPECIFIED__' && (
                  <span className="ml-2 text-cyan-400 font-semibold">
                    · {getCountryFlag(selectedCountry)} {selectedCountry}
                  </span>
                )}
              </div>

              {hasHorizontalOverflow && (
                <div className="inline-flex items-center gap-1.5 text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-2.5 py-0.5">
                  <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Scroll left / right for more columns</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(-260)}
                      disabled={!canScrollLeft}
                      aria-label="Scroll table left"
                      className="p-0.5 rounded hover:bg-cyan-500/20 disabled:opacity-30 transition-opacity"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(260)}
                      disabled={!canScrollRight}
                      aria-label="Scroll table right"
                      className="p-0.5 rounded hover:bg-cyan-500/20 disabled:opacity-30 transition-opacity"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {filteredLeads.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300">No companies match your current filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCountry('ALL');
                    setStatusFilter('all');
                    setSearch('');
                  }}
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Clear filters to view all {leads.length} companies
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Left horizontal scroll gradient + clickable pill */}
                {canScrollLeft && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent z-10" />
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(-280)}
                      aria-label="Scroll left"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-slate-900/95 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 shadow-lg text-[11px] font-bold transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Left</span>
                    </button>
                  </>
                )}

                {/* Right horizontal scroll gradient + clickable pill */}
                {canScrollRight && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10" />
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(280)}
                      aria-label="Scroll right for more columns"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 px-2.5 py-1.5 rounded-full bg-slate-900/95 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 shadow-lg text-[11px] font-bold transition-all"
                    >
                      <span>More</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <div
                  ref={scrollRef}
                  onScroll={updateScrollIndicators}
                  className="overflow-x-auto max-h-[68vh] overflow-y-auto"
                >
                  <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead className="bg-slate-950/95 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px]">Company</th>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px]">Country</th>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px]">City / Region</th>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px]">Website</th>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px]">Socials</th>
                        <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLeads.map((lead: any, idx: number) => {
                        const cleanDomain = lead.website
                          ? lead.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')
                          : null;
                        const cityRegion = [lead.city, lead.state].filter(Boolean).join(', ') || lead.location || null;

                        return (
                          <tr key={lead.id || idx} className="hover:bg-white/[0.04] transition-colors">
                            <td className="px-3.5 py-2 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-slate-800/90 flex items-center justify-center border border-slate-700/80 shrink-0">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <span className="truncate max-w-[210px] sm:max-w-[260px]" title={lead.companyName}>
                                  {lead.companyName}
                                </span>
                              </div>
                            </td>

                            <td className="px-3.5 py-2">
                              {lead.country ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCountry(
                                      selectedCountry.toLowerCase() === lead.country.toLowerCase() ? 'ALL' : lead.country
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-medium text-[11px] transition-colors"
                                  title={`Filter by ${lead.country}`}
                                >
                                  <span>{getCountryFlag(lead.country)}</span>
                                  <span>{lead.country}</span>
                                </button>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-3.5 py-2 text-slate-300">
                              {cityRegion ? (
                                <span className="inline-flex items-center gap-1 text-slate-300 max-w-[180px] truncate" title={cityRegion}>
                                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{cityRegion}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-3.5 py-2">
                              {cleanDomain ? (
                                <a
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1 max-w-[190px] truncate"
                                  title={cleanDomain}
                                >
                                  <span className="truncate">{cleanDomain}</span>
                                  <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-3.5 py-2">
                              {lead.socialLinks && lead.socialLinks.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  {lead.socialLinks.slice(0, 3).map((link: string, i: number) => (
                                    <a
                                      key={i}
                                      href={link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/70 transition-colors"
                                    >
                                      Link {lead.socialLinks.length > 1 ? i + 1 : ''}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-3.5 py-2 text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                                  lead.status === 'registered'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : lead.status === 'responded'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800/90 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {lead.status === 'registered'
                                  ? '✓ Joined'
                                  : lead.status === 'responded'
                                  ? '↩ Responded'
                                  : 'Invited'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-14 space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Building2 className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-lg font-bold text-white">Outreach launches November 1st</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              The ledger will begin filling up when our outreach campaign kicks off. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
