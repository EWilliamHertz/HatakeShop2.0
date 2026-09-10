import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.tsx';
import { Users, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TeamSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchTeam();
  }, [user]);

  
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/users/team/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamRole: newRole })
      });
      fetchTeam();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeam = async () => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/users/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTeam(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!team) return;
    const url = `${window.location.origin}/join?code=${team.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">{t('Loading team...')}</div>;

  return (
    <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 flex items-center">
          <Users className="w-6 h-6 mr-2 text-[#ffcc00]" /> Team Settings
        </h2>
        <p className="text-slate-400 mt-1">Manage your company's team members and invite colleagues to collaborate.</p>
      </div>

      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 uppercase tracking-wider mb-3">{t('Invite Team Members')}</h3>
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400 font-medium">Share this secret link to let others join your company's workspace directly.</p>
              <div className="mt-2 font-mono text-sm bg-slate-800 border border-slate-700 px-3 py-2 rounded text-slate-100">
                {window.location.origin}/join?code={team?.inviteCode}
              </div>
            </div>
            <button 
              onClick={copyLink}
              className="w-full md:w-auto px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 font-medium flex items-center justify-center whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied Link' : 'Copy Invite Link'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 uppercase tracking-wider mb-3">Active Members ({team?.members?.length || 0})</h3>
          <div className="border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100">
            {team?.members?.map((member: any) => (
              <div key={member.id} className="p-4 bg-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 text-slate-100 rounded-full flex items-center justify-center font-semibold tracking-tight">
                    {(member.displayName || member.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold tracking-tight text-slate-100">{member.displayName || 'No Name'}</div>
                    <div className="text-sm text-slate-400">{member.email}</div>
                  </div>
                </div>
                {member.id === team.teamOwnerId && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold tracking-tight rounded">{t('Owner')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
