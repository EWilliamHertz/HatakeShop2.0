const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

// Change export function Onboarding({ onComplete }: { onComplete: () => void }) 
// to export function Onboarding({ onComplete, backgroundImages = [] }: { onComplete: () => void, backgroundImages?: string[] })
code = code.replace(
  "export function Onboarding({ onComplete }: { onComplete: () => void }) {",
  "export function Onboarding({ onComplete, backgroundImages = [] }: { onComplete: () => void, backgroundImages?: string[] }) {"
);

// We need a fallback in case backgroundImages is empty.
// We can construct a list of images by repeating backgroundImages, or fallback to the gradients if it's empty.
const slotMachineHtmlOld = `            {[...MOCK_PRODUCTS, ...MOCK_PRODUCTS, ...MOCK_PRODUCTS].map((p, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-slate-800">
                  <div className={\`w-full h-full \${p.bg} flex items-center justify-center opacity-60\`}>
                    <span className="text-white/80 font-black text-2xl rotate-[-45deg] whitespace-nowrap tracking-wider drop-shadow-md">{p.type}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}`;

const slotMachineHtmlNew = `            {(backgroundImages.length > 0 
              ? [...backgroundImages, ...backgroundImages, ...backgroundImages, ...backgroundImages].slice(0, 15)
              : [...MOCK_PRODUCTS, ...MOCK_PRODUCTS, ...MOCK_PRODUCTS]).map((item, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-slate-800 relative">
                  {typeof item === 'string' ? (
                    <img src={item} alt="" className="w-full h-full object-cover grayscale opacity-50 mix-blend-screen" />
                  ) : (
                    <div className={\`w-full h-full \${item.bg} flex items-center justify-center opacity-60\`}>
                      <span className="text-white/80 font-black text-2xl rotate-[-45deg] whitespace-nowrap tracking-wider drop-shadow-md">{item.type}</span>
                    </div>
                  )}
                  {typeof item === 'string' && <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>}
                </div>
                <div className="h-2 bg-slate-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}`;

code = code.replace(slotMachineHtmlOld, slotMachineHtmlNew);

// Add logo underneath "Skip this step"
const skipTextOld = `              className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Skip this step, I'll browse manually
            </button>
          </motion.div>
        )}
      </div>
    </div>`;

const skipTextNew = `              className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors mb-8"
            >
              Skip this step, I'll browse manually
            </button>
            <div className="flex justify-center opacity-30 mt-4">
              <span className="text-xl font-black tracking-tighter text-white">HATAKE</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>`;

code = code.replace(skipTextOld, skipTextNew);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
