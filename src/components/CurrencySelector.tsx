import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, Currency } from './CurrencyProvider.tsx';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'SEK', label: 'SEK (kr)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
];

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('Select currency')}
        title={t('Select currency')}
        className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-300 hover:text-cyan-300 transition-colors bg-slate-900/90 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700/80"
      >
        <span>{currency}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
          <div className="p-1.5 space-y-0.5">
            {CURRENCIES.map((curr) => (
              <button
                type="button"
                key={curr.code}
                onClick={() => {
                  setCurrency(curr.code);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currency === curr.code
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {curr.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
