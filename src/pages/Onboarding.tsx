import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Loader2, Sparkles, MessageSquare, Briefcase, ShoppingBag, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const MOCK_PRODUCTS: any[] = [];

export function Onboarding() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0); 
  const [selectedRole, setSelectedRole] = useState<'buyer'|'seller'|'both'|null>(null);
  const [historyLog, setHistoryLog] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboardingPreferences');
      if (saved) setHistoryLog(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const { data: homeProductsData } = useQuery({ 
    queryKey: ['onboardingProducts'], 
    queryFn: async () => {
      const res = await fetch('/api-v2/products?sortBy=recommended');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const backgroundImages = useMemo(() => {
    const imgs = new Set<string>();
    const source = homeProductsData?.products || [];
    for (const p of source) {
      if (!p) continue;
      let parsed: string[] = [];
      try { parsed = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
      if (parsed[0]) imgs.add(parsed[0]);
    }
    let uniqueImgs = Array.from(imgs).sort(() => Math.random() - 0.5);
    // Pad the array to ensure the rainbow circle is fully populated (e.g., at least 40 items)
    if (uniqueImgs.length > 0) {
      while (uniqueImgs.length < 40) {
        uniqueImgs = [...uniqueImgs, ...Array.from(imgs).sort(() => Math.random() - 0.5)];
      }
    }
    return uniqueImgs;
  }, [homeProductsData]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedRole) return;

    setIsLoading(true);
    setStep(1);
    setErrorMsg('');

    const promptContext = selectedRole ? `I am a ${selectedRole}. ${input}` : input;

    try {
      const res = await fetch('/api-v2/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptContext })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to process onboarding");
      }

      localStorage.setItem('onboardingPreferences', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', 'true');
      setHistoryLog(data);
      setStep(2);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message);
      setIsLoading(false);
      setStep(0);
    }
  };

  const handleRoleToggle = (role: 'buyer'|'seller') => {
    if (selectedRole === 'both') {
      setSelectedRole(role === 'buyer' ? 'seller' : 'buyer');
    } else if (selectedRole === role) {
      setSelectedRole(null);
    } else if (selectedRole) {
      setSelectedRole('both');
    } else {
      setSelectedRole(role);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden z-[100]">
      {/* Rainbow Flowing Product Cycle */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div 
          className="absolute w-[240vh] h-[240vh] rounded-full"
          style={{ top: '20vh' }}
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 100, ease: "linear" }}
        >
          {backgroundImages.map((item, i) => {
             const angle = (i * (360 / backgroundImages.length));
             return (
               <div 
                 key={i} 
                 className="absolute left-1/2 top-1/2 -ml-[10vh] -mt-[14vh] w-[20vh] h-[28vh]"
                 style={{
                   transform: `rotate(${angle}deg) translateY(-120vh)`
                 }}
               >
                  <div className="w-full h-full bg-slate-900 border-2 border-slate-700/50 rounded-2xl p-2 shadow-2xl">
                    <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-800">
                      <img src={item} alt="" className="w-full h-full object-cover opacity-100 saturate-[1.3] shadow-2xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                    </div>
                  </div>
               </div>
             );
          })}
        </motion.div>
      </div>

      <div className="absolute top-8 left-0 right-0 flex justify-center z-50">
        <img src="/logo.png" alt="Hatake" className="h-12 w-auto drop-shadow-2xl hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/')} />
      </div>

      <div className="relative z-10 w-full max-w-3xl px-6 pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Tailor Your Hatake Experience
          </h1>
          <p className="text-lg text-slate-400 mb-6">
            Tell our AI about your business. We'll instantly organize the entire platform to prioritize the inventory that matters to you.
          </p>
          
          {step === 0 && (
            <div className="flex items-center justify-center gap-3 mb-8">
              <button 
                onClick={() => handleRoleToggle('buyer')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all border ${(selectedRole === 'buyer' || selectedRole === 'both') ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                <ShoppingBag className="w-4 h-4 inline-block mr-2 -mt-1" />
                Buyer
              </button>
              <span className="text-slate-500 text-sm font-medium">and/or</span>
              <button 
                onClick={() => handleRoleToggle('seller')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all border ${(selectedRole === 'seller' || selectedRole === 'both') ? 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]/50' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                <Briefcase className="w-4 h-4 inline-block mr-2 -mt-1" />
                Seller
              </button>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          {step === 0 && (
            <div className="space-y-8">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium mb-4">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl flex flex-col sm:flex-row">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="e.g., 'I got €450 to invest into Pokemon and sleeves, can you make a cart of RFQ to suppliers for me?'"
                    className="w-full bg-transparent text-white px-6 py-4 outline-none placeholder-slate-500 text-base"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() && !selectedRole}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-8 py-3 m-1 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    Configure
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {historyLog && (
                <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto text-left">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-4">
                    <History className="w-5 h-5" />
                    Previous Sourcing Profile
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Inferred Role:</span> <span className="capitalize">{historyLog.role}</span></p>
                    <p><span className="text-slate-500">Buying Scale:</span> <span className="capitalize">{historyLog.buyScale}</span></p>
                    {historyLog.interests?.length > 0 && (
                      <p><span className="text-slate-500">Top Interests:</span> {historyLog.interests.join(', ')}</p>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Enter a new prompt above to update these preferences.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-12 text-center shadow-2xl">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">Analyzing Profile...</h2>
              <p className="text-slate-400">Sorting through 140+ catalogs to find your best matches.</p>
            </div>
          )}

          {step === 2 && (
            <div className="bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <div className="w-16 h-16 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Profile Configured!</h2>
              <p className="text-cyan-100/70 mb-8 text-lg">Your personalized marketplace is ready. How would you like to proceed?</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => navigate('/')}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                >
                  Start Buying
                  <div className="text-xs font-medium opacity-75 mt-0.5">Enter the Marketplace</div>
                </button>
                <button 
                  onClick={() => navigate('/apply-seller')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-slate-700"
                >
                  Start Supplying
                  <div className="text-xs font-medium text-slate-400 mt-0.5">Submit an Application</div>
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {step === 0 && !historyLog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center">
            <button 
              onClick={() => {
                localStorage.setItem('onboardingCompleted', 'true');
                navigate('/');
              }}
              className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Skip this step, I'll browse manually
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
