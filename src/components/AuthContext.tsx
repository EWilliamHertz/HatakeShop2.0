import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithCustomToken, signOut, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, n: string) => Promise<void>;
  signInWithCustom: (token: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateDbUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signIn: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  signInWithCustom: async () => {},
  logOut: async () => {},
  updateDbUser: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Optimistically load from cache to instantly bypass 10s network throttle
    const cachedUser = localStorage.getItem('cached_user_session');
    const cachedDbUser = localStorage.getItem('cached_db_user_session');
    if (cachedUser) {
       try {
         const parsed = JSON.parse(cachedUser);
         const cachedToken = localStorage.getItem('cached_token');
         if (cachedToken) parsed.getIdToken = async () => cachedToken;
         setUser(parsed);
         if (cachedDbUser) {
           setDbUser(JSON.parse(cachedDbUser));
         } else {
           setDbUser({ 
             id: parsed.uid, 
             email: parsed.email, 
             role: 'buyer', 
             verificationStatus: 'pending',
             displayName: parsed.displayName || 'User'
           });
         }
         setLoading(false); // Instantly unlock UI
         // Background refresh to overwrite stale cached data (e.g. role changes)
         if (cachedToken) {
           fetch('/api-v2/profile', { headers: { 'Authorization': `Bearer ${cachedToken}` } })
             .then(r => r.ok ? r.json() : null)
             .then(fresh => { if (fresh) { setDbUser(fresh); localStorage.setItem('cached_db_user_session', JSON.stringify(fresh)); } })
             .catch(() => {});
         }
       } catch(e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let profileData = null;
        let token = '';
        try {
          token = await currentUser.getIdToken(true);
          
          try {
            // 1. Get profile FIRST so UI unblocks instantly
            const profileRes = await fetch('/api-v2/profile', {
              headers: { 'Authorization': `Bearer ${token}` },
              cache: 'no-store'
            });
            if (profileRes.ok) {
              profileData = await profileRes.json();
              setDbUser(profileData);
              localStorage.setItem('cached_db_user_session', JSON.stringify(profileData));
            } else {
              console.error("Failed to fetch user profile", await profileRes.text());
            }
          } catch (fetchErr: any) {
            console.error("Fetch profile threw an error, falling back to local defaults:", fetchErr);
          }

          // 2. Sync user to DB in the background
          const urlParams = new URLSearchParams(window.location.search);
          const inviteToken = urlParams.get('invite');
          fetch('/api-v2/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ inviteToken })
          }).catch(e => console.error("Background sync failed", e));

          localStorage.setItem('cached_user_session', JSON.stringify(currentUser));
          localStorage.setItem('cached_token', token);
        } catch (e: any) {
          console.error("Auth context outer error:", e);
        }

        // 3. Fallback: Guarantee dbUser is set even if token fetch or profile fetch crashed
        if (!profileData) {
          const fallbackUser = { 
            id: currentUser.uid, 
            email: currentUser.email, 
            role: 'buyer', 
            verificationStatus: 'pending',
            displayName: currentUser.displayName || 'User'
          };
          setDbUser(fallbackUser);
          localStorage.setItem('cached_db_user_session', JSON.stringify(fallbackUser));
        }
      } else {
        setDbUser(null);
        localStorage.removeItem('cached_user_session');
        localStorage.removeItem('cached_db_user_session');
        localStorage.removeItem('cached_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      
      const token = await userCredential.user.getIdToken();
      // Sync user to DB
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('invite');
      const res = await fetch('/api-v2/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inviteToken })
      });
      if (!res.ok) {
        console.error("Failed to sync new user to db");
      }
      
      // Auto-send verification email
      try {
        await fetch('/api-v2/auth/send-verification', {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) { console.error("Failed to send verification", e); }
    } catch (error) {
      console.error('Error registering with Email', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing in with Email', error);
      throw error;
    }
  };

  const signInWithCustom = async (token: string) => {
    try {
      // Server mints a real Firebase custom token.
      await signInWithCustomToken(auth, token);
    } catch (error) {
      console.error('Error signing in with Custom Token', error);
      throw error;
    }
  };

  const logOut = async () => {
    localStorage.removeItem('cached_user_session');
    localStorage.removeItem('cached_db_user_session');
    localStorage.removeItem('cached_token');
    await signOut(auth);
    setUser(null);
    setDbUser(null);
  };

  const updateDbUser = (data: any) => {
    setDbUser(data);
  }

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signIn, signInWithEmail, registerWithEmail, signInWithCustom, logOut, updateDbUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
