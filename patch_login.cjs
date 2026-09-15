const fs = require('fs');

let login = fs.readFileSync('src/pages/Login.tsx', 'utf-8');

const redirectFunc = `  const redirectAfterLogin = (defaultPath: string) => {
    const pendingCode = localStorage.getItem('pendingJoinCode');
    if (pendingCode) {
      localStorage.removeItem('pendingJoinCode');
      navigate('/join?code=' + pendingCode);
    } else {
      navigate(defaultPath);
    }
  };
`;

// Insert after `const navigate = useNavigate();`
login = login.replace(
  'const navigate = useNavigate();',
  'const navigate = useNavigate();\n' + redirectFunc
);

// Replace all navigate(...) with redirectAfterLogin(...)
login = login.replace(/navigate\('\/'\)/g, "redirectAfterLogin('/')");
login = login.replace(/navigate\('\/admin'\)/g, "redirectAfterLogin('/admin')");
login = login.replace(/navigate\('\/seller'\)/g, "redirectAfterLogin('/seller')");

fs.writeFileSync('src/pages/Login.tsx', login);
console.log("Patched Login.tsx");
