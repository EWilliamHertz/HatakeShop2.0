const fs = require('fs');

// Patch Home.tsx
let homeCode = fs.readFileSync('src/pages/Home.tsx', 'utf8');
homeCode = homeCode.replace(/import \{ Onboarding \} from '\.\/Onboarding\.tsx';\n/, '');
homeCode = homeCode.replace(/  const \[showOnboarding, setShowOnboarding\] = useState\(\(\) => \{\n    return !localStorage\.getItem\('onboardingCompleted'\);\n  \}\);\n/, '  const showOnboarding = !localStorage.getItem("onboardingCompleted");\n');
const oldOnboardingCall = /  const onboardingImages = React\.useMemo\(\(\) => \{[\s\S]*?if \(showOnboarding\) \{\n    return <Onboarding onComplete=\{\(\) => setShowOnboarding\(false\)\} backgroundImages=\{onboardingImages\} \/>;\n  \}/;
homeCode = homeCode.replace(oldOnboardingCall, '  if (showOnboarding) {\n    return <Navigate to="/onboarding" replace />;\n  }');
fs.writeFileSync('src/pages/Home.tsx', homeCode);

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/import \{ SplashModal \} from '\.\/components\/SplashModal\.tsx';\n/, '');
appCode = appCode.replace(/<SplashModal \/>\n/, '');
appCode = appCode.replace(/import \{ Home \} from '\.\/pages\/Home\.tsx';\n/, "import { Home } from './pages/Home.tsx';\nimport { Onboarding } from './pages/Onboarding.tsx';\n");
appCode = appCode.replace(/<Route index element=\{<Home \/>\} \/>\n/, '<Route index element={<Home />} />\n            <Route path="/onboarding" element={<Onboarding />} />\n');
fs.writeFileSync('src/App.tsx', appCode);

// Patch Layout.tsx to add the Nav link
let layoutCode = fs.readFileSync('src/components/Layout.tsx', 'utf8');
layoutCode = layoutCode.replace(
  /<Link to="\/marketplace" onClick=\{\(\) => setLogoMenuOpen\(false\)\} className="block px-4 py-2\.5 text-sm text-slate-100 hover:bg-slate-700 font-medium">\{t\('Marketplace'\)\}<\/Link>/,
  '<Link to="/marketplace" onClick={() => setLogoMenuOpen(false)} className="block px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700 font-medium">{t(\'Marketplace\')}</Link>\n                      <Link to="/onboarding" onClick={() => setLogoMenuOpen(false)} className="block px-4 py-2.5 text-sm text-cyan-400 hover:bg-slate-700 font-bold">{t(\'AI Sourcing Agent\')}</Link>'
);
fs.writeFileSync('src/components/Layout.tsx', layoutCode);
