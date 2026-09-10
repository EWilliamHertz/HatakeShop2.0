import React from 'react';
import { useCurrency } from './CurrencyContext.tsx';
import { ChevronDown } from 'lucide-react';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="relative group z-50">
      <button className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-[#ffcc00] transition-colors bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
        {currency}
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
      </button>
      
      <div className="absolute right-0 mt-2 w-32 bg-slate-800 rounded-xl shadow-none border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right">
        <div className="p-2 space-y-1">
          {['USD', 'EUR', 'GBP', 'JPY'].map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr as any)}
              className={`block w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                currency === curr 
                  ? 'bg-slate-700 text-slate-100' 
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
