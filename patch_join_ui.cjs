const fs = require('fs');

let joinCompany = fs.readFileSync('src/pages/JoinCompany.tsx', 'utf-8');

joinCompany = joinCompany.replace(
  `    if (!user) {\n       setError("You must be signed in to join a company.");\n       return;\n    }`,
  `    if (!user) {\n       navigate('/login?invite=' + code);\n       return;\n    }`
);

joinCompany = joinCompany.replace(
  `{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (\n              <>{t('Join Workspace')} <ArrowRight className="w-4 h-4 ml-2" /></>\n            )}`,
  `{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (\n              <>{!user ? t('Sign in to Join Workspace') : t('Join Workspace')} <ArrowRight className="w-4 h-4 ml-2" /></>\n            )}`
);

fs.writeFileSync('src/pages/JoinCompany.tsx', joinCompany);
console.log("Patched JoinCompany.tsx");
