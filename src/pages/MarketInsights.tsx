import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Activity, Users, Box, Globe, Filter } from 'lucide-react';
import { useCurrency } from '../components/CurrencyContext.tsx';

export function MarketInsights() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [timeRange, setTimeRange] = useState('30d');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetch('/api-v2/categories')
      .then(res => res.json())
      .then(json => setCategories(json))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api-v2/insights?timeRange=${timeRange}&category=${category}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [timeRange, category]);

  const COLORS = ['#4f46e5', '#3b82f6', '#0ea5e9', '#06b6d4', '#22d3ee'];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-display text-slate-100">Market Insights</h1>
          <p className="text-slate-400 mt-2 text-sm">Real-time macro trends and pricing volatility on Hatake.Shop</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-slate-800 p-2 rounded-xl border border-slate-700/60">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-accent focus:border-accent block p-2 outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-accent focus:border-accent block p-2 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
               <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex-1 flex justify-center items-center py-24">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : !data ? (
        <div className="py-24 text-center text-slate-400">Failed to load insights.</div>
      ) : (
        <>
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none flex items-center justify-between">
               <div>
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-1">Active Buyers</div>
                 <div className="text-3xl font-semibold tracking-tight font-display text-slate-100">{data.platformStats.activeBuyers.toLocaleString()}</div>
               </div>
               <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-[#ffcc00]">
                  <Users className="w-6 h-6" />
               </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none flex items-center justify-between">
               <div>
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-1">Verified Suppliers</div>
                 <div className="text-3xl font-semibold tracking-tight font-display text-slate-100">{data.platformStats.activeSellers.toLocaleString()}</div>
               </div>
               <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-[#ffcc00]">
                  <Globe className="w-6 h-6" />
               </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none flex items-center justify-between">
               <div>
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-1">Total RFQ Volume</div>
                 <div className="text-3xl font-semibold tracking-tight font-display text-slate-100">{formatPrice(data.platformStats.totalRfqVolume)}</div>
               </div>
               <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Activity className="w-6 h-6" />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Volume Over Time */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight font-display text-slate-100">RFQ Volume Over Time</h2>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.volumeOverTime}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffcc00" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffcc00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} minTickGap={20} />
                    <YAxis tickFormatter={(val) => `€${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} width={80} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}
                       formatter={(val: number) => formatPrice(val)}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#ffcc00" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Price Volatility Index */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight font-display text-slate-100">Price Volatility Index</h2>
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.priceVolatility}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} minTickGap={20} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}
                    />
                    <Line type="monotone" dataKey="index" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4f46e5' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trending Categories */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight font-display text-slate-100">Top Categories by Volume</h2>
                <Box className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trendingCategories} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `€${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }} width={100} />
                    <Tooltip 
                       cursor={{ fill: '#334155' }}
                       contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}
                       formatter={(val: number) => formatPrice(val)}
                    />
                    <Bar dataKey="volume" radius={[0, 6, 6, 0]} barSize={24}>
                      {data.trendingCategories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Top Buyers */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight font-display text-slate-100">Top Buyers</h2>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topBuyers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `€${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} width={80} />
                    <Tooltip 
                       cursor={{ fill: '#334155' }}
                       contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}
                       formatter={(val: number) => formatPrice(val)}
                    />
                    <Bar dataKey="volume" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
