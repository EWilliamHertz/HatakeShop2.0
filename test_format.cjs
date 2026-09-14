const formatPrice = (priceInUSD, currency) => {
    const converted = priceInUSD * 1;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(converted);
};

try { formatPrice(10, 'USD'); console.log('USD OK'); } catch(e) { console.log(e); }
try { formatPrice(10, ''); console.log('Empty OK'); } catch(e) { console.log('Empty failed:', e.message); }
try { formatPrice(10, null); console.log('Null OK'); } catch(e) { console.log('Null failed:', e.message); }
try { formatPrice(10, 'UNKNOWN'); console.log('UNKNOWN OK'); } catch(e) { console.log('UNKNOWN failed:', e.message); }
