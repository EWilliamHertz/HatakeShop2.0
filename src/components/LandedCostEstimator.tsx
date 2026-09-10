import React, { useState } from 'react';
import { Calculator, Plane, Package, Truck, Info, Percent, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface LandedCostEstimatorProps {
  quantity: number;
  currentPrice: number | null;
}

export function LandedCostEstimator({ quantity, currentPrice }: LandedCostEstimatorProps) {
  const [destination, setDestination] = useState<string>('EU');
  const [isOpen, setIsOpen] = useState(false);

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['landedCost', quantity, currentPrice, destination],
    queryFn: async () => {
      if (!currentPrice || !quantity) return null;
      const res = await fetch('/api-v2/logistics/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, currentPrice, destination })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch live rates');
      }
      return res.json();
    },
    enabled: !!currentPrice && !!quantity && isOpen,
    staleTime: 60000,
  });

  // Calculate fallback UI for closed state since we don't fetch until open to save API calls
  const displayUnit = stats ? stats.landedPerUnit.toFixed(2) : ((currentPrice || 0) * 1.3).toFixed(2);
  const currencySymbol = stats?.currency === 'USD' ? '$' : '€';

  return (
    <div className="mt-6 border border-slate-700 rounded-xl overflow-hidden bg-slate-800 shadow-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center space-x-2 font-semibold tracking-tight text-slate-100">
          <Calculator className="w-4 h-4 text-[#ffcc00]" />
          <span>Live Landed Cost Estimator</span>
        </div>
        <div className="text-sm font-semibold text-[#ffcc00] bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
          {isOpen && isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <>{currencySymbol}{displayUnit} / unit total (est.)</>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-tight text-slate-400 uppercase">Destination Region</span>
            <select 
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="text-sm border border-slate-700 rounded-xl px-2 py-1 bg-slate-800 outline-none focus:ring-2 focus:ring-ink font-medium"
            >
              <option value="EU">European Union</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="JP">Japan</option>
            </select>
          </div>

          {error ? (
            <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex items-start space-x-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Live Integration Incomplete</p>
                <p className="text-xs mt-1">{error.message}</p>
                <p className="text-xs mt-2 opacity-80">This feature requires a valid EasyPost API key configured in the environment variables.</p>
              </div>
            </div>
          ) : isLoading || !stats ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#ffcc00]" />
              <p className="text-sm font-medium">Fetching real-time freight rates...</p>
              <p className="text-xs opacity-70 mt-1">Connecting to EasyPost logistics network</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center"><Package className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Goods Value ({quantity}x)</span>
                <span className="font-semibold text-slate-100">{currencySymbol}{stats.baseTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center">
                  {stats.freightMethod.includes('Ocean') ? <Truck className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> : <Plane className="w-3.5 h-3.5 mr-1.5 text-slate-400" />}
                  Live Freight ({stats.freightMethod})
                </span>
                <span className="font-semibold text-slate-100">{currencySymbol}{stats.freightCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center"><Percent className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Import Duties ({(stats.dutyRate * 100).toFixed(1)}%)</span>
                <span className="font-semibold text-slate-100">{currencySymbol}{stats.dutyCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center"><Info className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Customs VAT ({(stats.vatRate * 100).toFixed(1)}%)</span>
                <span className="font-semibold text-slate-100">{currencySymbol}{stats.vatCost.toFixed(2)}</span>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="font-semibold tracking-tight text-slate-100">Guaranteed Landed Cost</span>
                <span className="font-semibold tracking-tight text-[#ffcc00] text-lg">{currencySymbol}{stats.totalLanded.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
