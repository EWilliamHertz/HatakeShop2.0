import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  UserPlus,
  Globe2,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Map as MapIcon,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { parseLeadGeo } from '../lib/leadGeo.ts';
import { toast } from 'sonner';
import { SafeImage } from '../components/SafeImage.tsx';

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
    'hong kong': '🇭🇰',
    taiwan: '🇹🇼',
    'south korea': '🇰🇷',
    singapore: '🇸🇬',
  };
  return map[c] || '🌍';
}

function isPartnerJoined(partner: any): boolean {
  return Boolean(partner?.signedUp || !partner?.isLeadOnly);
}

export function Suppliers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [joinedFilter, setJoinedFilter] = useState<'all' | 'joined' | 'not_joined'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationFn: async (targetId: number) => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Must be logged in to connect');
      const res = await fetch(`/api-v2/company/${targetId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (!res.ok) throw new Error('Failed to follow');
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('Connection updated!'));
      queryClient.invalidateQueries({ queryKey: ['publicPartners'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || t('Could not update connection'));
    },
  });

  const {
    data: rawPartners = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['publicPartners'],
    queryFn: async () => {
      const res = await fetch('/api-v2/public/partners');
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      return res.json();
    },
    retry: 2,
    retryDelay: 1500,
    staleTime: 30_000,
  });

  // Always normalize geo client-side as well so legacy location strings like
  // "Honolulu, Hawaii" -> { country: "United States", state: "Hawaii", city: "Honolulu" }
  // and "China" -> { country: "China", city: null } work seamlessly.
  const partners = useMemo(() => {
    const arr = Array.isArray(rawPartners) ? rawPartners : [];
    const mapped = arr.map((p: any) => {
      const geo = parseLeadGeo({
        country: p.country,
        state: p.state,
        city: p.city,
        location: p.location,
        website: p.website,
      });
      return {
        ...p,
        country: geo.country || null,
        state: geo.state || null,
        city: geo.city || null,
        location: geo.location || p.location || null,
      };
    });

    // Sort Joined suppliers first, then alphabetically
    mapped.sort((a: any, b: any) => {
      const aj = isPartnerJoined(a) ? 1 : 0;
      const bj = isPartnerJoined(b) ? 1 : 0;
      if (aj !== bj) return bj - aj;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return mapped;
  }, [rawPartners]);

  const membershipCounts = useMemo(() => {
    let joined = 0;
    let notJoined = 0;
    for (const p of partners) {
      if (isPartnerJoined(p)) joined++;
      else notJoined++;
    }
    return { all: partners.length, joined, notJoined };
  }, [partners]);

  // Base list filtered by membership status
  const statusFilteredPartners = useMemo(() => {
    return partners.filter((p: any) => {
      const joined = isPartnerJoined(p);
      if (joinedFilter === 'joined' && !joined) return false;
      if (joinedFilter === 'not_joined' && joined) return false;
      return true;
    });
  }, [partners, joinedFilter]);

  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let unspecified = 0;
    for (const p of statusFilteredPartners) {
      const c = (p.country || '').trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
      else unspecified++;
    }
    const list = Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
    return { list, unspecified };
  }, [statusFilteredPartners]);

  // Partners matching current Status + Country
  const countryFilteredPartners = useMemo(() => {
    return statusFilteredPartners.filter((p: any) => {
      if (selectedCountry === 'ALL') return true;
      if (selectedCountry === '__UNSPECIFIED__') return (p.country || '').trim() === '';
      return (p.country || '').trim().toLowerCase() === selectedCountry.toLowerCase();
    });
  }, [statusFilteredPartners, selectedCountry]);

  // Optional State / Region options within the selected country (e.g. Hawaii, Florida, California in United States)
  const stateOptions = useMemo(() => {
    if (selectedCountry === '__UNSPECIFIED__') return [];
    const counts = new Map<string, number>();
    for (const p of countryFilteredPartners) {
      const st = (p.state || '').trim();
      if (st) counts.set(st, (counts.get(st) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
  }, [countryFilteredPartners, selectedCountry]);

  // Cascading City options within the selected Country (+ optional State)
  const cityOptions = useMemo(() => {
    const counts = new Map<string, { city: string; state: string | null; count: number }>();
    for (const p of countryFilteredPartners) {
      if (selectedState !== 'ALL') {
        if ((p.state || '').trim().toLowerCase() !== selectedState.toLowerCase()) continue;
      }
      const city = (p.city || '').trim();
      if (!city) continue;
      const key = city.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { city, state: p.state || null, count: 1 });
      }
    }
    return Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || a.city.localeCompare(b.city)
    );
  }, [countryFilteredPartners, selectedState]);

  // Keep cascading State & City valid if upstream filter changes
  useEffect(() => {
    if (selectedState !== 'ALL') {
      const exists = stateOptions.some((s) => s.state.toLowerCase() === selectedState.toLowerCase());
      if (!exists) setSelectedState('ALL');
    }
  }, [stateOptions, selectedState]);

  useEffect(() => {
    if (selectedCity !== 'ALL') {
      const exists = cityOptions.some((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
      if (!exists) setSelectedCity('ALL');
    }
  }, [cityOptions, selectedCity]);

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();
    return countryFilteredPartners.filter((p: any) => {
      if (selectedState !== 'ALL') {
        if ((p.state || '').trim().toLowerCase() !== selectedState.toLowerCase()) return false;
      }
      if (selectedCity !== 'ALL') {
        if ((p.city || '').trim().toLowerCase() !== selectedCity.toLowerCase()) return false;
      }
      if (q) {
        const hay = [
          p.name,
          p.country,
          p.country === 'United States' ? 'USA US America' : '',
          p.state,
          p.city,
          p.location,
          p.region,
          p.companyFocus,
          p.website,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [countryFilteredPartners, selectedState, selectedCity, search]);

  const hasActiveFilters =
    joinedFilter !== 'all' ||
    selectedCountry !== 'ALL' ||
    selectedState !== 'ALL' ||
    selectedCity !== 'ALL' ||
    search.trim() !== '';

  const resetAllFilters = () => {
    setJoinedFilter('all');
    setSelectedCountry('ALL');
    setSelectedState('ALL');
    setSelectedCity('ALL');
    setSearch('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <h1 className="heading-xl">{t('Verified Supplier Directory')}</h1>
        <p className="text-slate-400 max-w-2xl text-sm sm:text-base">
          {t('Browse our network of vetted international TCG distributors, OEM manufacturers, and retail partners.')}
        </p>
      </div>

      {/* Filter Panel: Search + Joined/Not Joined + Country + Cascading State & City */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Top Row: Search + Membership Status Segmented Control */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder={t('Search companies, cities, states, countries, or focus...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Joined vs Not Joined toggle */}
          <div className="flex flex-wrap items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setJoinedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                joinedFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('All')}</span>
              <span className={`tabular-nums ${joinedFilter === 'all' ? 'text-slate-900/80' : 'text-slate-500'}`}>
                ({membershipCounts.all})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setJoinedFilter('joined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                joinedFilter === 'joined'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('Joined')}</span>
              <span className={`tabular-nums ${joinedFilter === 'joined' ? 'text-slate-900/80' : 'text-slate-500'}`}>
                ({membershipCounts.joined})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setJoinedFilter('not_joined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                joinedFilter === 'not_joined'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('Not Joined')}</span>
              <span className={`tabular-nums ${joinedFilter === 'not_joined' ? 'text-slate-900/80' : 'text-slate-500'}`}>
                ({membershipCounts.notJoined})
              </span>
            </button>
          </div>
        </div>

        {/* Second Row: Country -> Cascading State/Region -> Cascading City + Summary */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            stateOptions.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          } gap-3 items-center`}
        >
          {/* Country dropdown */}
          <div className="relative">
            <Globe2 className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('ALL');
                setSelectedCity('ALL');
              }}
              aria-label="Filter suppliers by country"
              className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">
                {t('All Countries')} ({statusFilteredPartners.length})
              </option>
              {countryOptions.list.map(({ country, count }) => (
                <option key={country} value={country}>
                  {getCountryFlag(country)} {country} ({count})
                </option>
              ))}
              {countryOptions.unspecified > 0 && (
                <option value="__UNSPECIFIED__">Global / Unspecified ({countryOptions.unspecified})</option>
              )}
            </select>
          </div>

          {/* State / Region dropdown (shown when states exist, e.g. Hawaii, Florida, California under United States) */}
          {stateOptions.length > 0 && (
            <div className="relative">
              <MapIcon className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('ALL');
                }}
                aria-label="Filter suppliers by state or region"
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">
                  {t('All States / Regions')} ({stateOptions.length})
                </option>
                {stateOptions.map(({ state, count }) => (
                  <option key={state} value={state}>
                    {state} ({count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* City dropdown (cascades from selected Country + State) */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filter suppliers by city"
              disabled={cityOptions.length === 0}
              className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 disabled:opacity-50 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">
                {cityOptions.length > 0
                  ? `${t('All Cities')} (${cityOptions.length})`
                  : t('All Cities (Country-wide)')}
              </option>
              {cityOptions.map(({ city, state, count }) => (
                <option key={city} value={city}>
                  {city}
                  {selectedState === 'ALL' && state ? `, ${state}` : ''} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Results summary + Clear Filters */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs">
            <span className="text-slate-300 font-medium">
              Showing <strong className="text-white tabular-nums">{filteredPartners.length}</strong> of{' '}
              <span className="tabular-nums text-slate-400">{partners.length}</span> suppliers
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Country Pills */}
        {countryOptions.list.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/70">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mr-1">
              {t('Countries')}:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCountry('ALL');
                setSelectedState('ALL');
                setSelectedCity('ALL');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedCountry === 'ALL'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              🌍 {t('All')} ({statusFilteredPartners.length})
            </button>
            {countryOptions.list.map(({ country, count }) => {
              const active = selectedCountry.toLowerCase() === country.toLowerCase();
              return (
                <button
                  key={country}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(active ? 'ALL' : country);
                    setSelectedState('ALL');
                    setSelectedCity('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{getCountryFlag(country)}</span>
                  <span>{country}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('Loading network...')}</div>
      ) : isError ? (
        <div className="bg-slate-900/50 border border-rose-500/30 rounded-2xl py-12 px-6 text-center space-y-3">
          <p className="text-sm font-semibold text-rose-300">
            Could not load supplier directory right now.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl py-14 px-6 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">{t('No suppliers match your filters')}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Try switching between Joined / Not Joined or clearing the Country or City filter.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPartners.map((partner: any, idx: number) => {
            const joined = isPartnerJoined(partner);
            const Wrapper: any = partner.id ? Link : 'div';
            const cleanDomain = partner.website
              ? String(partner.website).replace(/^https?:\/\//i, '').replace(/\/$/, '')
              : null;

            return (
              <Wrapper
                to={partner.id ? `/company/${partner.id}` : undefined}
                key={partner.id ? `partner-${partner.id}` : `lead-${idx}-${partner.name}`}
                className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-5 hover:border-cyan-500/70 hover:shadow-lg hover:shadow-cyan-900/20 transition-all group flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform border border-slate-700 shadow-md shrink-0 flex items-center justify-center bg-slate-900 text-cyan-400">
                  <SafeImage
                    src={partner.profilePictureUrl || partner.logoUrl}
                    alt={partner.name}
                    fallbackIcon={<Building2 className="w-6 h-6" />}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="text-base font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5 mb-2 line-clamp-1">
                  <span className="truncate">{partner.name}</span>
                  {partner.verificationStatus === 'verified' && (
                    <span title="Verified">
                      <BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" />
                    </span>
                  )}
                  {partner.verificationStatus === 'audited' && (
                    <span title="Audited">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    </span>
                  )}
                </h3>

                {/* Joined vs Not Joined badge */}
                <div className="mb-3">
                  {joined ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold tracking-wider uppercase">
                      ✓ {t('Joined')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold tracking-wider uppercase">
                      {t('Not Joined')} · {t('Invited')}
                    </span>
                  )}
                </div>

                {/* Clickable City, State & Country location box */}
                <div className="flex flex-col items-center justify-center text-xs font-medium text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/80 w-full mb-3 gap-0.5">
                  {(partner.city || partner.state) && (
                    <div className="flex items-center justify-center gap-1 flex-wrap text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      {partner.city && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (partner.country) setSelectedCountry(partner.country);
                            if (partner.state) setSelectedState(partner.state);
                            setSelectedCity(partner.city);
                          }}
                          className="font-bold hover:text-cyan-400 transition-colors"
                          title={`Filter by city: ${partner.city}`}
                        >
                          {partner.city}
                          {partner.state ? ',' : ''}
                        </button>
                      )}
                      {partner.state && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (partner.country) setSelectedCountry(partner.country);
                            setSelectedState(partner.state);
                            setSelectedCity('ALL');
                          }}
                          className="font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
                          title={`Filter by state/region: ${partner.state}`}
                        >
                          {partner.state}
                        </button>
                      )}
                    </div>
                  )}

                  {partner.country ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedCountry(partner.country);
                        setSelectedState('ALL');
                        setSelectedCity('ALL');
                      }}
                      className="font-bold text-[11px] uppercase tracking-wider text-cyan-300/90 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                      title={`Filter by country: ${partner.country}`}
                    >
                      {!partner.city && !partner.state && (
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      )}
                      <span>{getCountryFlag(partner.country)}</span>
                      <span>{partner.country}</span>
                    </button>
                  ) : (
                    !partner.city &&
                    !partner.state && (
                      <span className="font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> Global
                      </span>
                    )
                  )}
                </div>

                <div className="w-full mt-auto pt-3 border-t border-slate-700/50 flex flex-col space-y-2 text-left">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                      {t('Focus')}
                    </span>
                    <span className="text-xs font-medium text-slate-300 line-clamp-2">
                      {partner.companyFocus || t('Trading Cards & Games')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    {cleanDomain ? (
                      <a
                        href={
                          String(partner.website).startsWith('http')
                            ? partner.website
                            : `https://${partner.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1 truncate max-w-[150px]"
                        title={cleanDomain}
                      >
                        <span className="truncate">{cleanDomain}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          {t('Status')}
                        </span>
                        <span className={`text-xs font-semibold ${joined ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {joined ? t('Active Partner') : t('Outreach Sent')}
                        </span>
                      </div>
                    )}

                    {partner.id && (
                      <div className="text-cyan-400 text-xs font-bold group-hover:text-cyan-300 flex items-center shrink-0">
                        {t('Profile')} <span className="ml-1">→</span>
                      </div>
                    )}
                  </div>
                </div>

                {partner.id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      followMutation.mutate(partner.id);
                    }}
                    className="mt-3 w-full py-2 bg-slate-950 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold hover:bg-cyan-900/30 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {t('Connect')}
                  </button>
                ) : (
                  <div className="mt-3 w-full py-2 bg-slate-900/70 border border-slate-800 text-slate-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400/70" /> {t('Invited — Not Joined Yet')}
                  </div>
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
