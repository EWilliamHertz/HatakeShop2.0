import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithCustomToken,
  signOut,
  User,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  loading: boolean;
  isAdminPasswordSession: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, n: string) => Promise<void>;
  signInWithCustom: (token: string) => Promise<void>;
  adminLoginWithPassword: (password: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateDbUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isAdminPasswordSession: false,
  signIn: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  signInWithCustom: async () => {},
  adminLoginWithPassword: async () => {},
  logOut: async () => {},
  updateDbUser: () => {},
});

const ADMIN_TOKEN_KEY = 'hatake_admin_token';
const ADMIN_USER_KEY = 'hatake_admin_user';

function buildAdminSessionUser(token: string, adminDbUser: any): User {
  const fakeUser: any = {
    uid: adminDbUser?.uid || 'uJjvZKedn0MBrz75w6bd9Az8P0H3',
    email: adminDbUser?.email || 'ernst@hatake.eu',
    displayName: adminDbUser?.displayName || 'Hatake Admin',
    emailVerified: true,
    isAnonymous: false,
    getIdToken: async () => token,
    reload: async () => {},
  };
  return fakeUser as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminPasswordSession, setIsAdminPasswordSession] = useState(false);

  useEffect(() => {
    // 1. Check if an active .env Admin Password session exists
    const savedAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const savedAdminUserRaw = localStorage.getItem(ADMIN_USER_KEY);
    if (savedAdminToken && savedAdminUserRaw) {
      try {
        const parsedAdmin = JSON.parse(savedAdminUserRaw);
        setUser(buildAdminSessionUser(savedAdminToken, parsedAdmin));
        setDbUser({ ...parsedAdmin, role: 'admin', verificationStatus: 'verified' });
        setIsAdminPasswordSession(true);
        setLoading(false);
      } catch {}
    }

    // 2. Optimistically load cached Firebase session
    const cachedUser = localStorage.getItem('cached_user_session');
    const cachedDbUser = localStorage.getItem('cached_db_user_session');
    if (cachedUser && !savedAdminToken) {
      try {
        const parsed = JSON.parse(cachedUser);
        const cachedToken = localStorage.getItem('cached_token');
        if (cachedToken) parsed.getIdToken = async () => cachedToken;
        setUser(parsed);
        if (cachedDbUser) {
          const parsedDb = JSON.parse(cachedDbUser);
          if (parsedDb && parsedDb.displayName !== 'User') {
            setDbUser(parsedDb);
          }
        }
        setLoading(false);
        if (cachedToken) {
          fetch('/api-v2/profile', { headers: { Authorization: `Bearer ${cachedToken}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((fresh) => {
              if (fresh) {
                setDbUser(fresh);
                localStorage.setItem('cached_db_user_session', JSON.stringify(fresh));
              }
            })
            .catch(() => {});
        }
      } catch {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const activeAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      const activeAdminUserRaw = localStorage.getItem(ADMIN_USER_KEY);

      if (!currentUser && activeAdminToken && activeAdminUserRaw) {
        try {
          const parsedAdmin = JSON.parse(activeAdminUserRaw);
          setUser(buildAdminSessionUser(activeAdminToken, parsedAdmin));
          setDbUser({ ...parsedAdmin, role: 'admin', verificationStatus: 'verified' });
          setIsAdminPasswordSession(true);
          setLoading(false);
          return;
        } catch {}
      }

      setUser(currentUser);
      if (currentUser) {
        setIsAdminPasswordSession(false);
        let profileData = null;
        let token = '';
        try {
          token = await currentUser.getIdToken(true);

          try {
            let profileRes = await fetch('/api-v2/profile', {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            });
            if (!profileRes.ok && (profileRes.status === 429 || profileRes.status >= 500)) {
              await new Promise((r) => setTimeout(r, 1500));
              profileRes = await fetch('/api-v2/profile', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
              });
            }
            if (profileRes.ok) {
              profileData = await profileRes.json();
              setDbUser(profileData);
              localStorage.setItem('cached_db_user_session', JSON.stringify(profileData));
            }
          } catch (fetchErr: any) {
            console.error('Fetch profile threw an error:', fetchErr);
          }

          const urlParams = new URLSearchParams(window.location.search);
          const inviteToken = urlParams.get('invite');
          fetch('/api-v2/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ inviteToken }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((syncJson) => {
              if (!profileData && syncJson?.user) {
                setDbUser(syncJson.user);
                localStorage.setItem('cached_db_user_session', JSON.stringify(syncJson.user));
              }
            })
            .catch((e) => console.error('Background sync failed', e));

          localStorage.setItem('cached_user_session', JSON.stringify(currentUser));
          localStorage.setItem('cached_token', token);
        } catch (e: any) {
          console.error('Auth context outer error:', e);
        }

        if (!profileData) {
          let preserved: any = null;
          try {
            const rawPrev = localStorage.getItem('cached_db_user_session');
            if (rawPrev) {
              const parsedPrev = JSON.parse(rawPrev);
              if (
                parsedPrev &&
                typeof parsedPrev.id === 'number' &&
                parsedPrev.email?.toLowerCase() === currentUser.email?.toLowerCase()
              ) {
                preserved = parsedPrev;
              }
            }
          } catch {}

          if (preserved && preserved.displayName !== 'User') {
            setDbUser(preserved);
          } else {
            const emailName = currentUser.email ? currentUser.email.split('@')[0] : '';
            const prettyName = emailName
              ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
              : 'Account';
            setDbUser({
              id: currentUser.uid,
              email: currentUser.email,
              role: currentUser.email?.toLowerCase() === 'ernst@hatake.eu' ? 'admin' : 'buyer',
              verificationStatus: 'verified',
              displayName: currentUser.displayName || prettyName,
            });
          }
        }
      } else {
        setDbUser(null);
        setIsAdminPasswordSession(false);
        localStorage.removeItem('cached_user_session');
        localStorage.removeItem('cached_db_user_session');
        localStorage.removeItem('cached_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const adminLoginWithPassword = async (password: string) => {
    const res = await fetch('/api-v2/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Felaktigt administratörslösenord');
    }
    const adminUser = {
      ...(data.user || {}),
      role: 'admin',
      verificationStatus: 'verified',
    };
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
    localStorage.setItem('cached_token', data.token);
    localStorage.setItem('cached_db_user_session', JSON.stringify(adminUser));

    setUser(buildAdminSessionUser(data.token, adminUser));
    setDbUser(adminUser);
    setIsAdminPasswordSession(true);
  };

  const signIn = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });

    const token = await userCredential.user.getIdToken();
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    await fetch('/api-v2/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ inviteToken }),
    });

    try {
      await fetch('/api-v2/auth/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signInWithCustom = async (token: string) => {
    await signInWithCustomToken(auth, token);
  };

  const logOut = async () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem('cached_user_session');
    localStorage.removeItem('cached_db_user_session');
    localStorage.removeItem('cached_token');
    setIsAdminPasswordSession(false);
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setDbUser(null);
  };

  const updateDbUser = (data: any) => {
    setDbUser((prev: any) => {
      const merged =
        typeof data === 'function'
          ? data(prev)
          : typeof data === 'object'
            ? { ...(prev || {}), ...data }
            : data;
      try {
        localStorage.setItem('cached_db_user_session', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        isAdminPasswordSession,
        signIn,
        signInWithEmail,
        registerWithEmail,
        signInWithCustom,
        adminLoginWithPassword,
        logOut,
        updateDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
