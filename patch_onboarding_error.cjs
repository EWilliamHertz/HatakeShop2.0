const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedRole) return;

    setIsLoading(true);
    setStep(1);

    const promptContext = selectedRole ? \`I am a \${selectedRole}. \${input}\` : input;

    try {
      const res = await fetch('/api-v2/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptContext })
      });
      const data = await res.json();
      localStorage.setItem('onboardingPreferences', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', 'true');
      setHistoryLog(data);
      setStep(2);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setStep(0);
    }
  };`;

const newHandleSubmit = `  const [errorMsg, setErrorMsg] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedRole) return;

    setIsLoading(true);
    setStep(1);
    setErrorMsg('');

    const promptContext = selectedRole ? \`I am a \${selectedRole}. \${input}\` : input;

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
  };`;

code = code.replace(oldHandleSubmit, newHandleSubmit);
code = code.replace(`const [historyLog, setHistoryLog] = useState<any>(null);`, `const [historyLog, setHistoryLog] = useState<any>(null);\n  const [errorMsg, setErrorMsg] = useState('');`);

const oldForm = `              <form onSubmit={handleSubmit} className="relative group">`;
const newForm = `              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium mb-4">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleSubmit} className="relative group">`;

code = code.replace(oldForm, newForm);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
