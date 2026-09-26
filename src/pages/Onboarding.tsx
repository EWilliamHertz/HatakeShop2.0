import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_PRODUCTS = [
  { img: "https://i.ibb.co/d4NFtnjQ/Gem-Pack-V5.jpg", name: "Pokemon Gem Pack V.5" },
  { img: "https://i.ibb.co/3sXzj9H/OP05.jpg", name: "One Piece OP-05" },
  { img: "https://i.ibb.co/Pzhd8kK/Lorcana.jpg", name: "Disney Lorcana First Chapter" },
  { img: "https://i.ibb.co/C0W2kQp/Naruto.jpg", name: "Naruto Kayou Tier 4" },
  { img: "https://i.ibb.co/m0fTjF1/DBZ.jpg", name: "Dragon Ball Super" },
  { img: "https://i.ibb.co/F8qG6Kx/YGO.jpg", name: "Yu-Gi-Oh 25th Anniversary" }
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: input, 1: processing, 2: success

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setStep(1);

    try {
      const res = await fetch('/api-v2/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });
      const data = await res.json();
      localStorage.setItem('onboardingPreferences', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', 'true');
      setStep(2);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setStep(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden z-[100]">
      {/* Casino Slot Machine Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden flex gap-4 rotate-[-12deg] scale-125 translate-y-[-10%]">
        {[...Array(5)].map((_, colIdx) => (
          <motion.div
            key={colIdx}
            className="flex flex-col gap-4 min-w-[200px]"
            animate={{
              y: [0, -1000]
            }}
            transition={{
              repeat: Infinity,
              duration: 20 + (colIdx % 3) * 5,
              ease: "linear",
              repeatType: "loop"
            }}
          >
            {[...MOCK_PRODUCTS, ...MOCK_PRODUCTS, ...MOCK_PRODUCTS].map((p, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-slate-800">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover grayscale opacity-50" />
                </div>
                <div className="h-2 bg-slate-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Tailor Your Hatake Experience
          </h1>
          <p className="text-lg text-slate-400">
            Tell our AI about your business. We'll instantly organize the entire platform to prioritize the inventory that matters to you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {step === 0 && (
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl flex">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="e.g., 'I supply shops and need container loads of Chinese One Piece'"
                  className="w-full bg-transparent text-white px-6 py-4 outline-none placeholder-slate-500 text-lg"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-8 rounded-2xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Configure
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-12 text-center shadow-2xl">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">Analyzing Profile...</h2>
              <p className="text-slate-400">Sorting through 140+ catalogs to find your best matches.</p>
            </div>
          )}

          {step === 2 && (
            <div className="bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <div className="w-16 h-16 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Profile Configured!</h2>
              <p className="text-cyan-100/70">Entering your personalized marketplace...</p>
            </div>
          )}
        </motion.div>

        {step === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <button 
              onClick={() => {
                localStorage.setItem('onboardingCompleted', 'true');
                onComplete();
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
