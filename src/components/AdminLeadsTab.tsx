import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ExternalLink, Edit2, Check, X, CheckSquare, Square, UserCheck, Send, Eye, Mail, AlertTriangle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

type LeadView = 'to-send' | 'sent' | 'recruited' | 'all';

export function AdminLeadsTab({ leads: leadsProp, user, fetchAdminData, setPreviewingHtml }: any) {
  const leads: any[] = (Array.isArray(leadsProp) ? leadsProp : []).map(l => ({
    ...l,
    socialLinks: Array.isArray(l.socialLinks) ? l.socialLinks : (typeof l.socialLinks === 'string' ? [l.socialLinks] : [])
  }));
  const [view, setView] = useState<LeadView>('to-send');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; show: boolean; duplicates: number; added: number }>({
    current: 0,
    total: 0,
    show: false,
    duplicates: 0,
    added: 0
  });
  const [projectFile, setProjectFile] = useState<{ available: boolean; filename?: string; sizeBytes?: number } | null>(null);
  const [syncingFile, setSyncingFile] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    isOpen: boolean;
    added: number;
    duplicates: number;
    total: number;
    source: string;
    duplicateSamples?: Array<{ email: string; companyName?: string; reason: string }>;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, show: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    const checkAvailableFile = async () => {
      try {
        let token;
        try { token = await user?.getIdToken(); } catch (e) { return; }
        if (!token) return;
        const res = await fetch('/api-v2/admin/leads/available-file', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProjectFile(data);
        }
      } catch (e) {
        // ignore
      }
    };
    checkAvailableFile();
  }, [user]);

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
      if (!res.ok) throw new Error(data.error || 'Failed to add lead');

      if (data.duplicates > 0) {
        toast.warning(`This lead (${manualLead.email}) already exists and was not added as a duplicate.`);
      } else {
        toast.success(`Added new lead successfully.`);
      }
      setIsManualAddModalOpen(false);
      setManualLead({ businessName: '', email: '', website: '', facebook: '', instagram: '', city: '', state: '' });
      if (fetchAdminData) fetchAdminData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add lead manually");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleSyncProjectFile = async () => {
    const filename = projectFile?.filename || 'Pokemon_Card_Stores.csv';
    if (!confirm(`Import leads from project file "${filename}"? Any duplicates will be detected and skipped.`)) return;
    setSyncingFile(true);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth error'); }
      const res = await fetch('/api-v2/admin/leads/sync-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync from file');

      if (data.duplicates > 0) {
        toast.warning(`${data.duplicates.toLocaleString()} duplicate lead(s) detected and skipped (not added).`, {
          duration: 7000,
          description: `Imported ${data.added.toLocaleString()} new lead(s) from ${data.filename || filename}.`
        });
      }
      if (data.added > 0) {
        toast.success(`Successfully imported ${data.added.toLocaleString()} new lead(s) from ${data.filename || filename}!`);
      } else if (data.duplicates > 0) {
        toast.info(`No new leads added. All ${data.duplicates.toLocaleString()} were duplicates.`);
      }

      setImportSummary({
        isOpen: true,
        added: data.added || 0,
        duplicates: data.duplicates || 0,
        total: data.total || 0,
        source: data.filename || filename,
        duplicateSamples: data.duplicateSamples || []
      });

      if (fetchAdminData) fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Error syncing project file');
    } finally {
      setSyncingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^[\ufeff\s"']+|["'\s]+$/g, '').trim(),
      complete: async (results) => {
        try {
          let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth error'); }
          const allRows: any[] = results.data || [];
          if (allRows.length === 0) {
            toast.error('The selected CSV file contains no data.');
            setUploading(false);
            return;
          }

          const CHUNK_SIZE = 500;
          let totalAdded = 0;
          let totalDuplicates = 0;
          const allDuplicateSamples: any[] = [];

          setUploadProgress({
            current: 0,
            total: allRows.length,
            show: true,
            duplicates: 0,
            added: 0
          });

          for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
            const chunk = allRows.slice(i, i + CHUNK_SIZE);
            const res = await fetch('/api-v2/admin/leads/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ leads: chunk })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Upload failed at row ${i + 1}`);
            }

            const data = await res.json();
            totalAdded += (data.added || 0);
            totalDuplicates += (data.duplicates || 0);
            if (Array.isArray(data.duplicateSamples)) {
              allDuplicateSamples.push(...data.duplicateSamples);
            }

            setUploadProgress({
              current: Math.min(i + chunk.length, allRows.length),
              total: allRows.length,
              show: true,
              duplicates: totalDuplicates,
              added: totalAdded
            });
          }

          if (totalDuplicates > 0) {
            toast.warning(`${totalDuplicates.toLocaleString()} duplicate lead(s) detected and skipped (not added).`, {
              duration: 7000,
              description: `Imported ${totalAdded.toLocaleString()} new leads out of ${allRows.length.toLocaleString()} total rows.`
            });
          }
          if (totalAdded > 0) {
            toast.success(`Import complete! ${totalAdded.toLocaleString()} new leads added.`);
          } else if (totalDuplicates > 0) {
            toast.info(`No new leads added. All ${totalDuplicates.toLocaleString()} rows were duplicates.`);
          }

          setImportSummary({
            isOpen: true,
            added: totalAdded,
            duplicates: totalDuplicates,
            total: allRows.length,
            source: file.name,
            duplicateSamples: allDuplicateSamples.slice(0, 50)
          });

          if (fetchAdminData) fetchAdminData();
        } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Error importing CSV');
        } finally {
          setUploading(false);
          setTimeout(() => setUploadProgress(p => ({ ...p, show: false })), 3000);
          e.target.value = '';
        }
      },
      error: (err) => {
        setUploading(false);
        toast.error(`CSV parse error: ${err.message}`);
      }
    });
  };

  const sendNext50 = async () => {
    if (!confirm('Send to the next 50 pending leads?')) return;
    setSending(true);
    setSendProgress({ current: 0, total: 50, show: true });
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error('Auth Error'); }
      // Simulate progress for better UX before the request completes
      const interval = setInterval(() => {
        setSendProgress(prev => prev.current < 45 ? { ...prev, current: prev.current + Math.floor(Math.random() * 5) + 1 } : prev);
      }, 300);
      
      const res = await fetch('/api-v2/admin/leads/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ limit: 50 })
      });
      clearInterval(interval);
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      
      setSendProgress({ current: data.sent, total: data.sent, show: true });
      setTimeout(() => setSendProgress(p => ({ ...p, show: false })), 2000);
      
      toast.success(`Successfully dispatched ${data.sent} invitations.`);
      setSelectedIds(new Set());
      fetchAdminData();
    } catch(e: any) { 
      toast.error(e.message || 'Send failed');
      setSendProgress(p => ({ ...p, show: false }));
    } finally { 
      setSending(false); 
    }
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
               <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" 
                    onKeyDown={(e) => { if (e.key === 'Escape') setIsManualAddModalOpen(false); }} 
                    tabIndex={-1} 
                    ref={el => el?.focus()}>
               
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm">
                {uploading ? 'Processing…' : '↑ Upload CSV'}
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  disabled={uploading || syncingFile}
                  onChange={handleFileUpload} 
                />
              </label>

              {projectFile?.available && (
                <button
                  type="button"
                  onClick={handleSyncProjectFile}
                  disabled={syncingFile || uploading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 disabled:opacity-50"
                  title={`Import ${projectFile.filename} directly from project`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                  {syncingFile ? 'Syncing...' : `⚡ Import ${projectFile.filename}`}
                </button>
              )}
            </div>

            {uploadProgress.show && (
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="text-cyan-400">Importing CSV ({uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()})</span>
                  <span className="text-slate-400">
                    <span className="text-emerald-400">+{uploadProgress.added} added</span> • <span className="text-amber-400">{uploadProgress.duplicates} duplicates skipped</span>
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-200" 
                    style={{ width: `${Math.min(100, (uploadProgress.current / (uploadProgress.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Import Summary Modal */}
        {importSummary?.isOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
               onKeyDown={(e) => { if (e.key === 'Escape') setImportSummary(null); }}
               tabIndex={-1}
               ref={el => el?.focus()}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    CSV Import Report
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">File: <span className="text-slate-300 font-mono">{importSummary.source}</span></p>
                </div>
                <button 
                  onClick={() => setImportSummary(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5"/>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Rows</div>
                  <div className="text-2xl font-black text-white mt-1 tabular-nums">{importSummary.total.toLocaleString()}</div>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Added (New)</div>
                  <div className="text-2xl font-black text-emerald-300 mt-1 tabular-nums">+{importSummary.added.toLocaleString()}</div>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Dupes Skipped</div>
                  <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums">{importSummary.duplicates.toLocaleString()}</div>
                </div>
              </div>

              {importSummary.duplicates > 0 ? (
                <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl mb-4 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Duplicate Notification:</strong> {importSummary.duplicates.toLocaleString()} duplicate lead(s) were seen (either already present in the database or duplicated within the CSV) and <strong>were not added</strong>.
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-xl mb-4 text-xs text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>All leads in this import were unique and imported successfully with 0 duplicates.</div>
                </div>
              )}

              {importSummary.duplicateSamples && importSummary.duplicateSamples.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col mb-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sample Duplicates (Not Added):
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto max-h-48 divide-y divide-slate-800/80 text-xs">
                    {importSummary.duplicateSamples.slice(0, 30).map((d, i) => (
                      <div key={i} className="p-2.5 flex justify-between items-center text-slate-300 hover:bg-slate-900/50">
                        <div className="truncate pr-2">
                          <span className="font-mono text-slate-200">{d.email}</span>
                          {d.companyName && <span className="text-slate-500 ml-1.5 font-sans">({d.companyName})</span>}
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          {d.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button 
                  onClick={() => setImportSummary(null)} 
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors border border-slate-600 relative overflow-hidden">
            {sendProgress.show ? (
              <div className="absolute inset-0 bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, (sendProgress.current / sendProgress.total) * 100)}%` }}></div>
            ) : null}
            <span className="relative z-10">{sendProgress.show ? `Sending... (${sendProgress.current}/${sendProgress.total})` : '⚡ Send to Next 50 Pending'}</span>
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
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                         <span className="text-2xl">🔍</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">No Leads Found</h3>
                      <p className="text-sm max-w-sm mx-auto">
                        {view === 'recruited' ? 'You haven\'t recruited any companies yet. Try sending some invitations!' : 'We couldn\'t find any leads matching your current filters.'}
                      </p>
                      {view !== 'recruited' && (
                        <button onClick={() => setIsManualAddModalOpen(true)} className="mt-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-cyan-900/20">
                          + Add Your First Lead Manually
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
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