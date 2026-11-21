import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type Currency = 'SEK' | 'EUR' | 'USD' | 'GBP' | 'JPY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (priceInBase: number) => string;
  formatSEK: (priceInSEK: number | string | null | undefined) => string;
  rates: Record<string, number>;
}

const DEFAULT_RATES: Record<string, number> = {
  EUR: 1,
  SEK: 11.45,
  USD: 1.09,
  GBP: 0.85,
  JPY: 163.5,
};

export function formatSEKValue(priceInSEK: number | string | null | undefined, locale = 'sv-SE'): string {
  const num = typeof priceInSEK === 'string' ? parseFloat(priceInSEK) : Number(priceInSEK);
  if (!Number.isFinite(num) || num <= 0) return '0 kr';
  const hasDecimals = Math.round(num * 100) % 100 !== 0;
  try {
    const formatted = new Intl.NumberFormat(locale === 'en' ? 'en-SE' : 'sv-SE', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(num);
    return `${formatted} kr`;
  } catch {
    return `${hasDecimals ? num.toFixed(2) : Math.round(num)} kr`;
  }
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'EUR',
  setCurrency: () => {},
  formatPrice: () => '',
  formatSEK: (v) => formatSEKValue(v),
  rates: DEFAULT_RATES,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('hatake_b2b_currency') as Currency | null;
      if (saved && ['SEK', 'EUR', 'USD', 'GBP', 'JPY'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'EUR';
  });

  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem('hatake_b2b_currency', curr);
    } catch {}
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/rates');
        if (res.ok) {
          const data = await res.json();
          if (data?.rates) {
            setRates({
              EUR: 1,
              SEK: data.rates.SEK || 11.45,
              USD: data.rates.USD || 1.09,
              GBP: data.rates.GBP || 0.85,
              JPY: data.rates.JPY || 163.5,
            });
          }
        }
      } catch {
        // Silent fallback to DEFAULT_RATES
      }
    };
    fetchRates();
  }, []);

  const formatPrice = (priceInBase: number) => {
    if (isNaN(priceInBase) || priceInBase == null) return 'N/A';

    const safeCurrency: Currency = ['SEK', 'EUR', 'USD', 'GBP', 'JPY'].includes(currency) ? currency : 'EUR';
    const rate = rates[safeCurrency] || 1;
    const converted = priceInBase * rate;

    if (safeCurrency === 'SEK') {
      return formatSEKValue(converted, i18n?.language || 'sv');
    }

    try {
      const locale = i18n?.language?.startsWith('sv') ? 'sv-SE' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: safeCurrency,
        maximumFractionDigits: safeCurrency === 'JPY' ? 0 : 2,
      }).format(converted);
    } catch {
      return `${safeCurrency} ${converted.toFixed(2)}`;
    }
  };

  const formatSEK = (priceInSEK: number | string | null | undefined) => {
    return formatSEKValue(priceInSEK, i18n?.language || 'sv');
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatSEK, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};
