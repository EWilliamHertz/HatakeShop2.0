const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const authImport = `import { useAuth } from '../components/AuthContext.tsx';
import { getAuth, signInWithCustomToken } from 'firebase/auth';`;
if (!code.includes('signInWithCustomToken')) {
  code = code.replace(/import \{ useAuth \} from '\.\.\/components\/AuthContext\.tsx';/, authImport);
}

const handleImpersonateCode = `
  const handleImpersonate = async (userId: string | number) => {
    try {
      const { user } = useAuth.getState();
      const res = await fetch(\`/api-v2/admin/impersonate/\${userId}\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${await user?.getIdToken()}\`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const auth = getAuth();
      await signInWithCustomToken(auth, data.token);
      toast.success('Impersonation successful. Redirecting to Feed...');
      window.location.href = '/feed';
    } catch (err: any) {
      toast.error('Failed to impersonate: ' + err.message);
    }
  };
`;

// useAuth.getState() doesn't exist because it's a standard React Context, so we just use the existing `const { user } = useAuth();` hook.

const injectImpersonate = `
  const handleImpersonate = async (userId: string | number) => {
    if(!confirm('Are you sure you want to log in as this user? You will act on their behalf.')) return;
    try {
      const res = await fetch(\`/api-v2/admin/impersonate/\${userId}\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${await user?.getIdToken()}\`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const auth = getAuth();
      await signInWithCustomToken(auth, data.token);
      toast.success('Logged in as user!');
      window.location.href = '/feed';
    } catch (err: any) {
      toast.error('Failed to impersonate: ' + err.message);
    }
  };
`;

if (!code.includes('handleImpersonate')) {
  // Find where const { user } is
  code = code.replace(/const \{ user, dbUser \} = useAuth\(\);/, 'const { user, dbUser } = useAuth();\n' + injectImpersonate);
}

const impersonateButton = `
                      <button onClick={() => setEditingUser(u)} className="text-[#ffcc00] font-semibold tracking-tight hover:underline">Edit User</button>
                      <button onClick={() => handleImpersonate(u.id)} className="text-cyan-400 font-semibold tracking-tight hover:underline ml-3">Impersonate</button>
`;

code = code.replace(/<button onClick=\{\(\) => setEditingUser\(u\)\} className="text-\[#ffcc00\] font-semibold tracking-tight hover:underline">Edit User<\/button>/, impersonateButton);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log('AdminDashboard updated');
