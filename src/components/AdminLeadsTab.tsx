import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ExternalLink, Edit2, Check, X, Search, CheckSquare, Square } from 'lucide-react';

export function AdminLeadsTab({ leads, user, fetchAdminData, setPreviewingHtml }: any) {
  const [leadFilter, setLeadFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const filteredLeads = leads.filter((l: any) => {
    if (segmentFilter !== 'all' && (l.segment || 'TCG') !== segmentFilter) return false;
    if (leadFilter !== 'all') {
      if (leadFilter === 'to-send' && l.status !== 'pending' && l.status !== null) return false;
      if (leadFilter !== 'to-send' && l.status !== leadFilter) return false;
    }
    if (emailStatusFilter === 'has-email' && !l.email) return false;
    if (emailStatusFilter === 'no-email' && l.email) return false;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l:any) => l.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleUpdateLeadStatus = async (id: number, status: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth Error"); }
      await fetch(`/api-v2/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch (e) { toast.error("Error updating"); }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth Error"); }
      const res = await fetch(`/api-v2/admin/leads/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Lead updated');
      setEditingId(null);
      fetchAdminData();
    } catch (e) {
      toast.error('Failed to update lead');
    }
  };

  const sendToSelected = async () => {
    if (selectedIds.size === 0) return toast.error('Select leads first');
    if (!confirm(`Send to ${selectedIds.size} selected leads?`)) return;
    setSending(true);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth Error"); }
      const res = await fetch('/api-v2/admin/leads/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) })
      });
      if (res.ok) {
        toast.success('Emails queued for sending!');
        setSelectedIds(new Set());
        fetchAdminData();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-none flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold tracking-tight text-slate-100 text-lg">Import Leads</h3>
            <label className="cursor-pointer text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
              {uploading ? 'Parsing...' : 'Upload CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 Papa.parse(file, {
                    header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
                    complete: async (results) => {
                       try {
                          setUploading(true);
                          let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth error"); }
                          const res = await fetch('/api-v2/admin/leads/upload', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                             body: JSON.stringify({ leads: results.data })
                          });
                          if (res.ok) {
                             const data = await res.json();
                             toast.success(`Imported ${data.added || 0} leads.`);
                             fetchAdminData();
                          } else toast.error('Failed to import leads');
                       } catch (err) { toast.error('Error importing leads'); } 
                       finally { setUploading(false); }
                    }
                 });
              }} />
            </label>
          </div>
          <p className="text-xs text-slate-400">Maps automatically to: Business Name, City, State, Email 1, Website, Facebook, Instagram.</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-none flex flex-col justify-center gap-3">
           <h3 className="font-semibold tracking-tight text-slate-100 text-lg mb-1">Outreach Campaigns</h3>
           <div className="flex gap-2">
             <button disabled={sending} onClick={async () => {
                let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth Error"); }
                const res = await fetch('/api-v2/admin/leads/preview', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                setPreviewingHtml(data.html);
             }} className="flex-1 py-2 bg-slate-900 text-slate-300 border border-slate-700 text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors">
               Preview Template
             </button>
             <button disabled={sending} onClick={sendToSelected} className="flex-1 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-400 transition-colors">
               {sending ? 'Sending...' : `Send to Selected (${selectedIds.size})`}
             </button>
           </div>
           <button disabled={sending} onClick={async () => {
             if (!confirm('Send to the next 50 pending leads?')) return;
             setSending(true);
             try {
                let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Auth Error"); }
                await fetch('/api-v2/admin/leads/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ limit: 50 })
                });
                toast.success('Sent 50 emails');
                setSelectedIds(new Set());
                fetchAdminData();
             } finally { setSending(false); }
           }} className="w-full py-2 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors">
             Send to Next 50 (Pending)
           </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 overflow-hidden flex flex-col min-h-[600px]">
        <div className="bg-slate-900 p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <span className="font-semibold tracking-tight text-slate-100 text-lg">Lead Database Spreadsheet</span>
          <div className="flex gap-2 flex-wrap">
             <select value={emailStatusFilter} onChange={(e) => setEmailStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 outline-none focus:border-cyan-500">
                <option value="all">Email: All</option>
                <option value="has-email">Email: Provided</option>
                <option value="no-email">Email: Missing</option>
             </select>
             <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 outline-none focus:border-cyan-500">
                <option value="to-send">Status: To-Send</option>
                <option value="recruited">Status: Recruited</option>
                <option value="sent">Status: Sent</option>
                <option value="all">Status: All</option>
             </select>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1 bg-slate-900">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 w-10">
                   <button onClick={handleSelectAll} className="text-slate-400 hover:text-cyan-400 transition-colors">
                     {selectedIds.size === filteredLeads.length && filteredLeads.length > 0 ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                   </button>
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Store / Company Name</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Email Address</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Website URL</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Social Links</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Location</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredLeads.map((lead: any) => {
                const isSelected = selectedIds.has(lead.id);
                const isEditing = editingId === lead.id;
                
                return (
                <tr key={lead.id} className={`hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-cyan-900/10' : ''}`}>
                  <td className="px-4 py-3">
                     <button onClick={() => toggleSelect(lead.id)} className={`transition-colors ${isSelected ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}>
                       {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                     </button>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <input type="text" className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full text-sm" value={editData.companyName || ''} onChange={e => setEditData({...editData, companyName: e.target.value})}/> : <span className="font-semibold text-white">{lead.companyName || '-'}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <input type="text" className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full text-sm" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})}/> : 
                       lead.email ? <span className="text-slate-300">{lead.email}</span> : <span className="text-rose-400 font-medium text-xs">Missing</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? <input type="text" className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full text-sm" value={editData.website || ''} onChange={e => setEditData({...editData, website: e.target.value})}/> : 
                       lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1">{lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3"/></a> : '-'
                    }
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    {isEditing ? <input type="text" className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full text-sm" placeholder="Comma separated URLs" value={(editData.socialLinks || []).join(', ')} onChange={e => setEditData({...editData, socialLinks: e.target.value.split(',').map((s:string) => s.trim())})}/> : 
                       (lead.socialLinks && lead.socialLinks.length > 0) ? (
                         <div className="flex gap-2">
                           {lead.socialLinks.map((link:string, i:number) => (
                              <a key={i} href={link} target="_blank" rel="noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-slate-300 transition-colors">
                                Social {i+1}
                              </a>
                           ))}
                         </div>
                       ) : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{lead.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${lead.status === 'recruited' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : lead.status === 'sent' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                      {(lead.status || 'pending')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1"><Check className="w-4 h-4"/></button>
                         <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-rose-400 p-1"><X className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                         <button onClick={() => { setEditingId(lead.id); setEditData(lead); }} className="text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 className="w-4 h-4"/></button>
                         {lead.status !== 'recruited' && (
                           <button onClick={() => handleUpdateLeadStatus(lead.id, 'recruited')} className="text-emerald-500 hover:text-emerald-400 font-semibold text-xs border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors">
                              Recruit
                           </button>
                         )}
                      </div>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}