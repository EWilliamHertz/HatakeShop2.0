import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProductModal } from '../components/ProductModal.tsx';
import { useCart } from '../components/SampleCart.tsx';



export function SwedenShop() {
  const { addSverigeItem } = useCart();
  const [sverigeProducts, setSverigeProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api-v2/sverige-products')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSverigeProducts(data))
      .catch(console.error);
  }, []);
  const { t, i18n } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    // Force Swedish for this page if it's the preferred default for the Sweden shop
    if (i18n.language !== 'sv') {
      i18n.changeLanguage('sv');
    }
  }, [i18n]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <img src="/logo.png" alt="Hatake Logo" className="h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 mb-6 font-display tracking-tight">
            Hatake Sverige
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Välkommen till vår svenska butik! Här hittar du våra produkter som finns tillgängliga direkt från vårt lager i Sverige. Snabba leveranser inom hela landet.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-12 shadow-2xl">
           <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">Produkter i Lager (Sverige)</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {sverigeProducts.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProduct(p)}
                  className="bg-slate-800 rounded-2xl p-4 border border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer flex flex-col"
                >
                   <div className="aspect-square bg-slate-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                      <img src={(p.sverigeImages && p.sverigeImages.length > 0) ? p.sverigeImages[0] : p.images[0]} alt={(p.sverigeTitle || p.title)} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">{(p.sverigeTitle || p.title)}</h3>
                   <p className="text-slate-400 text-sm mb-4 line-clamp-2">{p.description}</p>
                   <div className="mt-auto">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-xl font-bold text-cyan-400">{(p.sverigePrice || p.unitCost)} kr</span>
                         <button className="text-slate-300 hover:text-white underline text-sm transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }}>
                           Visa info
                         </button>
                      </div>
                      <button 
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          addSverigeItem({
                            productId: p.id,
                            title: (p.sverigeTitle || p.title),
                            image: (p.sverigeImages && p.sverigeImages.length > 0) ? p.sverigeImages[0] : p.images[0],
                            sellerName: p.seller.companyName,
                            sellerId: 1, // Hatake Sverige
                            unitCost: (p.sverigePrice || p.unitCost),
                            quantity: 1
                          });
                        }}
                      >
                        Lägg i varukorg
                      </button>
                   </div>
                </div>
              ))}

           </div>
        </div>
        
        <div className="text-center mt-8">
           <Link to="/" className="text-cyan-400 hover:text-cyan-300 font-medium underline">
             Tillbaka till globala grossistbutiken (B2B)
           </Link>
        </div>
      </div>
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          hideMOQ={true} 
          onAddToCart={() => {
            addSverigeItem({
              productId: selectedProduct.id,
              title: (selectedProduct.sverigeTitle || selectedProduct.title),
              image: (selectedProduct.sverigeImages && selectedProduct.sverigeImages.length > 0) ? selectedProduct.sverigeImages[0] : selectedProduct.images[0],
              sellerName: selectedProduct.seller?.companyName || 'Hatake Sverige',
              sellerId: 1,
              unitCost: (selectedProduct.sverigePrice || selectedProduct.unitCost),
              quantity: 1
            });
          }}
        />
      )}
    </div>
  );
}
