const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldHandleSubmit = `      const data = await res.json();
      localStorage.setItem('onboardingPreferences', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', 'true');
      setStep(2);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {`;

const newHandleSubmit = `      const data = await res.json();
      localStorage.setItem('onboardingPreferences', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', 'true');
      setStep(2);
    } catch (error) {`;

code = code.replace(oldHandleSubmit, newHandleSubmit);

const oldStep2 = `{step === 2 && (
            <div className="bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <div className="w-16 h-16 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Profile Configured!</h2>
              <p className="text-cyan-100/70">Entering your personalized marketplace...</p>
            </div>
          )}`;

const newStep2 = `{step === 2 && (
            <div className="bg-cyan-500/10 backdrop-blur border border-cyan-500/30 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <div className="w-16 h-16 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Profile Configured!</h2>
              <p className="text-cyan-100/70 mb-8 text-lg">Your personalized marketplace is ready. How would you like to proceed?</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => { onComplete(); }}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                >
                  Start Buying
                  <div className="text-xs font-medium opacity-75 mt-0.5">Enter the Marketplace</div>
                </button>
                <button 
                  onClick={() => { window.location.href = '/apply-seller'; }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-all border border-slate-700"
                >
                  Start Supplying
                  <div className="text-xs font-medium text-slate-400 mt-0.5">Submit an Application</div>
                </button>
              </div>
            </div>
          )}`;

code = code.replace(oldStep2, newStep2);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
