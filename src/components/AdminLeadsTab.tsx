import React, { useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ExternalLink, Edit2, Check, X, CheckSquare, Square, UserCheck, Send, Eye, Mail } from 'lucide-react';

type LeadView = 'to-send' | 'sent' | 'recruited' | 'all';

export function AdminLeadsTab({ leads: leadsProp, user, fetchAdminData, setPreviewingHtml }: any) {
  const leads: any[] = (Array.isArray(leadsProp) ? leadsProp : []).map(l => ({
    ...l,
    socialLinks: Array.isArray(l.socialLinks) ? l.socialLinks : (typeof l.socialLinks === 'string' ? [l.socialLinks] : [])
  }));
  const [view, setView] = useState<LeadView>('to-send');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const toSend   = leads.filter((l: any) => !l.status || l.status === 'pending');
  const sent     = leads.filter((l: any) => l.status === 'sent' || l.status === 'opened' || l.status === 'clicked' || l.status === 'failed');
  const recruited = leads.filter((l: any) => l.status === 'recruited');

  const filteredLeads = (() => {
    let base: any[] = view === 'to-send' ? toSend : view === 'sent' ? sent : view === 'recruited' ? recruited : leads;
    if (emailStatusFilter === 'has-email') base = base.filter((l: any) => l.email);
    if (emailStatusFilter === 'no-email')  base = base.filter((l: any) => !l.email);
    return base;
  })();

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredLeads.map((l: any) => l.id)));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleUpdateLeadStatus = async (id: number, status: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth Error'); }
      await fetch(`/api-v2/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
      toast.success(`Lead marked as ${status}`);
    } catch (e) { toast.error('Error updating'); }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth Error'); }
      const res = await fetch(`/api-v2/admin/leads/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Lead updated');
      setEditingId(null);
      fetchAdminData();
    } catch (e) { toast.error('Failed to update lead'); }
  };

  const sendToSelected = async () => {
    if (selectedIds.size === 0) return toast.error('Select at least one lead first');
    if (!confirm(`Send invitation to ${selectedIds.size} selected lead(s)?`)) return;
    setSending(true);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth Error'); }
      const res = await fetch('/api-v2/admin/leads/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      toast.success(`Sent ${data.sent} invitation${data.sent === 1 ? '' : 's'}!`);
      setSelectedIds(new Set());
      fetchAdminData();
    } catch(e: any) { toast.error(e.message || 'Send failed'); }
    finally { setSending(false); }
  };
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [manualLead, setManualLead] = useState({
    businessName: '', email: '', website: '', facebook: '', instagram: '', city: '', state: ''
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      if (!manualLead.email || !manualLead.businessName) return;

      const newLeads = [{
        "Business Name": manualLead.businessName,
        "Email": manualLead.email,
        "Website": manualLead.website,
        "Facebook": manualLead.facebook,
        "Instagram": manualLead.instagram,
        "City": manualLead.city,
        "State": manualLead.state,
      }];

      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth error'); }
      const res = await fetch('/api-v2/admin/leads/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leads: newLeads })
      });
      
      const data = await res.json();
      toast.success(`Added new lead successfully.`);
      setIsManualAddModalOpen(false);
      setManualLead({ businessName: '', email: '', website: '', facebook: '', instagram: '', city: '', state: '' });
      if (fetchAdminData) fetchAdminData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add lead manually");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const sendNext50 = async () => {
    if (!confirm('Send to the next 50 pending leads?')) return;
    setSending(true);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth Error'); }
      const res = await fetch('/api-v2/admin/leads/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ limit: 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      toast.success(`Sent ${data.sent} invitations!`);
      setSelectedIds(new Set());
      fetchAdminData();
    } catch(e: any) { toast.error(e.message || 'Send failed'); }
    finally { setSending(false); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending:   'bg-slate-800 text-slate-400 border-slate-700',
      sent:      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      opened:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
      clicked:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      recruited: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      failed:    'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return map[status] || map.pending;
  };

  const tabs: { key: LeadView; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'to-send',   label: 'To Send',   count: toSend.length,    icon: <Send className="w-3.5 h-3.5"/> },
    { key: 'sent',      label: 'Sent',      count: sent.length,      icon: <Eye className="w-3.5 h-3.5"/> },
    { key: 'recruited', label: 'Recruited', count: recruited.length, icon: <UserCheck className="w-3.5 h-3.5"/> },
    { key: 'all',       label: 'All',       count: leads.length,     icon: <Mail className="w-3.5 h-3.5"/> },
  ];

  return (
    <div className="space-y-6">

      {/* Top action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Import */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-100 text-base">Import Leads</h3>
              <button 
                onClick={() => setIsManualAddModalOpen(true)}
                className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 px-3 py-1 rounded text-xs font-bold transition-colors"
              >
                + Add Manually
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">CSV maps to: Business Name, Email, Website, Facebook, Instagram, City, State.</p>

            {isManualAddModalOpen && (
               <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                 <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                   <h2 className="text-xl font-bold text-white mb-4">Add Lead Manually</h2>
                   <form onSubmit={handleManualAdd} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                       <input type="text" value={manualLead.businessName} onChange={e => setManualLead({...manualLead, businessName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" required />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                       <input type="email" value={manualLead.email} onChange={e => setManualLead({...manualLead, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" required />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-400 mb-1">Website</label>
                       <input type="text" value={manualLead.website} onChange={e => setManualLead({...manualLead, website: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-slate-400 mb-1">City</label>
                         <input type="text" value={manualLead.city} onChange={e => setManualLead({...manualLead, city: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-400 mb-1">State</label>
                         <input type="text" value={manualLead.state} onChange={e => setManualLead({...manualLead, state: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-slate-400 mb-1">Facebook</label>
                         <input type="text" value={manualLead.facebook} onChange={e => setManualLead({...manualLead, facebook: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-400 mb-1">Instagram</label>
                         <input type="text" value={manualLead.instagram} onChange={e => setManualLead({...manualLead, instagram: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                       </div>
                     </div>
                     
                     <div className="flex justify-end gap-3 pt-2">
                       <button 
                         type="button" 
                         onClick={() => setIsManualAddModalOpen(false)}
                         className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                         disabled={isSubmittingManual}
                       >
                         Cancel
                       </button>
                       <button 
                         type="submit"
                         className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                         disabled={isSubmittingManual}
                       >
                         {isSubmittingManual ? 'Adding...' : 'Add Lead'}
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
             )}
          </div>
          <label className="cursor-pointer self-start text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            {uploading ? 'Parsing…' : '↑ Upload CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              Papa.parse(file, {
                header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
                complete: async (results) => {
                  try {
                    setUploading(true);
                    let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth error'); }
                    const res = await fetch('/api-v2/admin/leads/upload', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ leads: results.data })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      toast.success(`Imported ${data.added || 0} new leads.`);
                      fetchAdminData();
                    } else toast.error('Failed to import');
                  } catch (err) { toast.error('Error importing'); }
                  finally { setUploading(false); }
                }
              });
            }} />
          </label>
        </div>

        {/* Outreach Actions */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between gap-3">
          <h3 className="font-bold text-slate-100 text-base">Outreach</h3>
          <div className="flex gap-2 flex-wrap">
            <button disabled={sending} onClick={async () => {
              let token; try { token = await user?.getIdToken(); } catch(e:any) { return; }
              const res = await fetch('/api-v2/admin/leads/preview', { headers: { 'Authorization': `Bearer ${token}` } });
              const data = await res.json();
              setPreviewingHtml(data.html);
            }} className="flex-1 py-2 bg-slate-900 text-slate-300 border border-slate-700 text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors">
              Preview Template
            </button>
            <button disabled={sending || selectedIds.size === 0} onClick={sendToSelected}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${selectedIds.size > 0 ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              {sending ? 'Sending…' : `Send to Selected (${selectedIds.size})`}
            </button>
          </div>
          <button disabled={sending} onClick={sendNext50}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors border border-slate-600">
            ⚡ Send to Next 50 Pending
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setView(t.key); setSelectedIds(new Set()); }}
            className={`rounded-xl border p-4 text-left transition-all ${view === t.key ? 'bg-slate-800 border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className={`flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider ${view === t.key ? 'text-cyan-400' : 'text-slate-500'}`}>
              {t.icon} {t.label}
            </div>
            <div className={`text-2xl font-black tabular-nums ${view === t.key ? 'text-white' : 'text-slate-400'}`}>{t.count.toLocaleString()}</div>
          </button>
        ))}
      </div>

      {/* Database Grid */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-100 text-sm">
              {tabs.find(t => t.key === view)?.label} Leads
            </span>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
              {filteredLeads.length} shown
            </span>
          </div>
          <select value={emailStatusFilter} onChange={(e) => setEmailStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 outline-none">
            <option value="all">All Emails</option>
            <option value="has-email">Has Email</option>
            <option value="no-email">Missing Email</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={handleSelectAll} className="text-slate-500 hover:text-cyan-400 transition-colors">
                    {selectedIds.size > 0 && selectedIds.size === filteredLeads.length ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                  </button>
                </th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Socials</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLeads.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-600">
                  {view === 'recruited' ? '🎉 No recruited companies yet — send invites to get started!' : 'No leads match these filters.'}
                </td></tr>
              )}
              {filteredLeads.map((lead: any) => {
                const isSelected = selectedIds.has(lead.id);
                const isEditing  = editingId === lead.id;
                return (
                  <tr key={lead.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-cyan-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(lead.id)} className={isSelected ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}>
                        {isSelected ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-bold text-white max-w-[160px] truncate">
                      {isEditing
                        ? <input type="text" className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-sm" value={editData.companyName || ''} onChange={e => setEditData({...editData, companyName: e.target.value})}/>
                        : lead.companyName || '-'}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate">
                      {isEditing
                        ? <input type="text" className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-sm" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})}/>
                        : lead.email
                          ? <span className="text-slate-300 text-xs">{lead.email}</span>
                          : <span className="text-rose-400 text-xs font-medium">Missing</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate">
                      {isEditing
                        ? <input type="text" className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-sm" value={editData.website || ''} onChange={e => setEditData({...editData, website: e.target.value})}/>
                        : lead.website
                          ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1 text-xs">
                              {lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5"/>
                            </a>
                          : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing
                        ? <input type="text" placeholder="URLs, comma sep." className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-sm" value={(Array.isArray(editData.socialLinks) ? editData.socialLinks : []).join(', ')} onChange={e => setEditData({...editData, socialLinks: e.target.value.split(',').map((s: string) => s.trim())})}/>
                        : (Array.isArray(lead.socialLinks) && lead.socialLinks.length > 0)
                          ? <div className="flex gap-1">
                              {lead.socialLinks.map((link: string, i: number) => (
                                typeof link === 'string' ? 
                                <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                  Social {i+1}
                                </a> : null
                              ))}
                            </div>
                          : <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{lead.location || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${statusBadge(lead.status || 'pending')}`}>
                        {lead.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1"><Check className="w-4 h-4"/></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-rose-400 p-1"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingId(lead.id); setEditData({...lead}); }} className="text-slate-600 hover:text-cyan-400 transition-colors p-1">
                            <Edit2 className="w-3.5 h-3.5"/>
                          </button>
                          {lead.status !== 'recruited' && (
                            <button onClick={() => handleUpdateLeadStatus(lead.id, 'recruited')}
                              className="text-emerald-500 hover:text-emerald-400 text-xs font-bold border border-emerald-500/30 px-2 py-0.5 rounded hover:bg-emerald-500/10 transition-colors">
                              ✓ Recruit
                            </button>
                          )}
                          {lead.status === 'recruited' && (
                            <button onClick={() => handleUpdateLeadStatus(lead.id, 'pending')}
                              className="text-slate-500 hover:text-slate-400 text-xs font-bold border border-slate-700 px-2 py-0.5 rounded transition-colors">
                              Undo
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}