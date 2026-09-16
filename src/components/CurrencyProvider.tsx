import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (priceInUSD: number) => string;
  rates: Record<string, number>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  formatPrice: () => '',
  rates: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.5 }
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.5
  });

  useEffect(() => {
    // In a real production app, we would fetch from an API like Frankfurter here.
    // For this implementation, we simulate fetching live rates.
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/rates')
        if (res.ok) {
          const data = await res.json();
          setRates({
            USD: 1,
            EUR: data.rates.EUR || 0.92,
            GBP: data.rates.GBP || 0.79,
            JPY: data.rates.JPY || 150.5,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch live exchange rates, using defaults", err);
      }
    };
    fetchRates();
  }, []);

  const formatPrice = (priceInUSD: number) => {
    if (isNaN(priceInUSD) || priceInUSD == null) return "N/A";
    
    const safeCurrency = ['USD', 'EUR', 'GBP', 'JPY'].includes(currency) ? currency : 'USD';
    const rate = rates[safeCurrency] || 1;
    const converted = priceInUSD * rate;
    
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
