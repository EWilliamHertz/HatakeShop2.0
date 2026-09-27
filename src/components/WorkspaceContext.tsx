import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface Company {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role?: string;
}

interface WorkspaceContextType {
  activeCompanyId: number | null;
  companies: Company[];
  setActiveCompanyId: (id: number | null) => void;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeCompanyId: null,
  companies: [],
  setActiveCompanyId: () => {},
  loading: true,
});

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dbUser, user } = useAuth();
  const [activeCompanyId, setActiveCompanyIdState] = useState<number | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setActiveCompanyIdState(null);
      setLoading(false);
      return;
    }

    const fetchCompanies = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api-v2/workspaces', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies);
          
          const cachedId = localStorage.getItem('active_company_id');
          if (cachedId && data.companies.some((c: Company) => c.id === parseInt(cachedId))) {
            setActiveCompanyIdState(parseInt(cachedId));
          } else if (dbUser?.activeCompanyId && data.companies.some((c: Company) => c.id === dbUser.activeCompanyId)) {
            setActiveCompanyIdState(dbUser.activeCompanyId);
          } else if (data.companies.length > 0) {
            setActiveCompanyIdState(data.companies[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch workspaces", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user, dbUser]);

  const setActiveCompanyId = (id: number | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem('active_company_id', id.toString());
      // Optionally sync to backend
      user?.getIdToken().then(token => {
        fetch('/api-v2/workspaces/active', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCompanyId: id })
        }).catch(console.error);
      });
    } else {
      localStorage.removeItem('active_company_id');
    }
  };

  return (
    <WorkspaceContext.Provider value={{ activeCompanyId, companies, setActiveCompanyId, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
