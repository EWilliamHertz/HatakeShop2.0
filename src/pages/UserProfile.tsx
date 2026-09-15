import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { User, Building2, MapPin, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function UserProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['userProfile', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/users/${id}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    }
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading user profile...</div>;
  if (error || !user) return <div className="p-8 text-center text-red-400">Error loading user profile</div>;

  const roleDisplay = user.teamRole === 'owner' ? 'Administrator' : user.teamRole === 'sales_rep' ? 'Sales Representative' : 'Catalog Manager';
  const companyId = user.teamOwnerId || user.id;

  return (
    <div className="max-w-4xl mx-auto pt-20 px-4 pb-20">
      <Helmet>
        <title>{user.displayName || 'User'} | Hatake Shop</title>
      </Helmet>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-8 shadow-xl">
        <div className="h-48 bg-gradient-to-r from-cyan-900 to-slate-900 relative">
          <div className="absolute -bottom-16 left-8 flex items-end">
            <div className="w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-700 overflow-hidden shadow-2xl">
              {user.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-slate-400">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-20 px-8 pb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">{user.displayName}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-400 mb-6">
            {user.companyName && (
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                <Link to={`/company/${companyId}`} className="text-cyan-400 hover:underline flex items-center">
                  {user.companyName}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-700/50 text-xs font-semibold text-slate-300 border border-slate-600/50">
                  {roleDisplay}
                </span>
              </div>
            )}
            {user.country && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {user.country}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
