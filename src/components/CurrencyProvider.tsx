import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (priceInUSD: number) => string;
  rates: Record<string, number>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'EUR',
  setCurrency: () => {},
  formatPrice: () => '',
  rates: { EUR: 1, USD: 1.09, GBP: 0.85, JPY: 163.5 }
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [rates, setRates] = useState<Record<string, number>>({
    EUR: 1, USD: 1.09, GBP: 0.85, JPY: 163.5
  });

  useEffect(() => {
    // In a real production app, we would fetch from an API like Frankfurter here.
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/rates')
        if (res.ok) {
          const data = await res.json();
          setRates({
            EUR: 1,
            USD: data.rates.USD || 1.09,
            GBP: data.rates.GBP || 0.85,
            JPY: data.rates.JPY || 163.5,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch live exchange rates, using defaults", err);
      }
    };
    fetchRates();
  }, []);

  const formatPrice = (priceInBase: number) => {
    if (isNaN(priceInBase) || priceInBase == null) return "N/A";
    
    const safeCurrency = ['USD', 'EUR', 'GBP', 'JPY'].includes(currency) ? currency : 'EUR';
    const rate = rates[safeCurrency] || 1;
    const converted = priceInBase * rate;
    
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: safeCurrency,
        maximumFractionDigits: safeCurrency === 'JPY' ? 0 : 2
      }).format(converted);
    } catch (e) {
      return `${safeCurrency} ${converted.toFixed(2)}`;
    }
  };

  useEffect(() => {
    // Disabled localStorage
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};
