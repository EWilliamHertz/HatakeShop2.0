import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';

export function DatabaseViewer() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      let token; try { token = await user.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/admin/raw-leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="p-8 text-center text-slate-400">Loading database...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h1 className="text-3xl font-extrabold text-white">Raw Leads Database View</h1>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-300">ID</th>
                <th className="px-6 py-3 font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 font-semibold text-slate-300">Company Name</th>
                <th className="px-6 py-3 font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-300">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{row.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-100">{row.email}</td>
                  <td className="px-6 py-4 text-slate-300">{row.companyName || <span className="text-slate-400 italic">null</span>}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{row.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
