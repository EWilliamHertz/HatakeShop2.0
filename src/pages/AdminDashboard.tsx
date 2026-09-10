import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext.tsx';
import { ShieldAlert, Users, Package, Activity, Edit2, Trash2, X } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader.tsx';
import Papa from 'papaparse';
import { toast } from 'sonner';


function CategoryManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [editing, setEditing] = React.useState<any>(null);
  const [adding, setAdding] = React.useState<any>(false);

  React.useEffect(() => { fetchCats(); }, []);

  const fetchCats = async () => {
    const res = await fetch('/api-v2/categories');
    if(res.ok) setCategories(await res.json());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const url = editing ? `/api-v2/categories/${editing.id}` : '/api-v2/categories';
      const method = editing ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editing || adding)
      });
      if (!res.ok) throw new Error('Failed to save category');
      setEditing(null);
      setAdding(false);
      fetchCats();
      toast.success(t('Category saved successfully'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Network error: Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
    await fetch(`/api-v2/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    fetchCats();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col mt-6 max-h-[600px]">
      <div className="bg-slate-900 p-5 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">{t('Manage Categories')}</h2>
        <button onClick={() => setAdding({ name: '', slug: '', parentId: null, sortOrder: 0, isVisibleIfEmpty: false })} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 text-sm py-1.5 px-4">{t('+ Add Category')}</button>
      </div>
      <div className="divide-y divide-slate-100 overflow-y-auto">
        {categories.map(c => (
          <div key={c.id} className="p-4 flex justify-between items-center hover:bg-slate-900 transition-colors">
            <div>
              <div className="font-medium text-slate-100">{c.name}</div>
              <div className="text-xs text-slate-400">Slug: {c.slug} {c.parentId && `• Parent ID: ${c.parentId}`} • Sort: {c.sortOrder} • {c.isVisibleIfEmpty ? "Visible if empty" : "Hidden if empty"}</div>
            </div>
            <div className="flex space-x-2 shrink-0">
               <button onClick={() => setEditing(c)} className="p-2 text-slate-400 hover:text-[#ffcc00] rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
               <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {(editing || adding) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setEditing(null); setAdding(false); }}>\n          <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 w-full max-w-md overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900">
              <h3 className="font-semibold tracking-tight text-slate-100">{editing ? 'Edit' : 'Add'} Category</h3>
              <button onClick={() => { setEditing(null); setAdding(false); }} className="text-slate-400 hover:text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Name</label>
                <input required type="text" value={(editing || adding).name || ''} onChange={e => editing ? setEditing({...editing, name: e.target.value}) : setAdding({...adding, name: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Slug</label>
                <input required type="text" value={(editing || adding).slug || ''} onChange={e => editing ? setEditing({...editing, slug: e.target.value}) : setAdding({...adding, slug: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Parent Category (optional)</label>
                <select 
                  value={(editing || adding).parentId || ''} 
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    editing ? setEditing({...editing, parentId: val}) : setAdding({...adding, parentId: val});
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Sort Order</label>
                  <input type="number" value={(editing || adding).sortOrder || 0} onChange={e => editing ? setEditing({...editing, sortOrder: parseInt(e.target.value) || 0}) : setAdding({...adding, sortOrder: parseInt(e.target.value) || 0})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>
                <div className="flex-1 flex items-center mt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={(editing || adding).isVisibleIfEmpty || false} onChange={e => editing ? setEditing({...editing, isVisibleIfEmpty: e.target.checked}) : setAdding({...adding, isVisibleIfEmpty: e.target.checked})} className="form-checkbox h-5 w-5 text-[#ffcc00] rounded border-slate-700 focus:ring-ink" />
                    <span className="text-sm font-semibold tracking-tight text-slate-400">Visible if empty</span>
                  </label>
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="submit" className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState<any[]>([]);
  
  const handleUpdateFeedback = async (id: number, status: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch(`/api-v2/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      }
    } catch(e) {}
  };

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [marketingLogs, setMarketingLogs] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [approvals, setApprovals] = useState({ pendingUsers: [], pendingProducts: [] });
  const [addingUser, setAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', companyName: '', role: 'seller' });
  const [marketingForm, setMarketingForm] = useState({ campaignName: '', targetSegment: '', messageContent: '' });
  const [affiliateForm, setAffiliateForm] = useState({ companyName: '', contactEmail: '', website: '' });

  const [leads, setLeads] = useState([]);
  const [leadFilter, setLeadFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [sentCount, setSentCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingLog, setViewingLog] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      let token;
      try { 
        token = await user?.getIdToken(); 
      } catch(e:any) { 
        toast.error("[DEBUG Admin] Firebase Auth failed: " + e.message);
        setLoading(false);
        return;
      }
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Serialize requests to avoid Cloud Shell proxy dropping concurrent connections
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) return await res.json();
          return null;
        } catch (e) { return null; }
      };

      const statsData = await safeFetch('/api-v2/admin/stats');
      if (statsData) setStats(statsData);

      const mktData = await safeFetch('/api-v2/admin/marketing');
      if (mktData) setMarketingLogs(mktData);

      const affData = await safeFetch('/api-v2/admin/affiliates');
      if (affData) setAffiliates(affData);

      const leadsData = await safeFetch('/api-v2/admin/leads');
      if (leadsData) { setLeads(leadsData.leads); setSentCount(leadsData.sentCount); }

      const approvalsData = await safeFetch('/api-v2/admin/approvals');
      if (approvalsData) setApprovals(approvalsData);

    } catch (e: any) {
      console.error(e);
      toast.error("[DEBUG Admin] Unexpected: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  const fetchAdminStats = async () => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch('/api-v2/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(marketingForm)
      });
      setMarketingForm({ campaignName: '', targetSegment: '', messageContent: '' });
      fetchAdminData();
    } catch(e) {}
  };
  
  const handleAddAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch('/api-v2/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(affiliateForm)
      });
      setAffiliateForm({ companyName: '', contactEmail: '', website: '' });
      fetchAdminData();
    } catch(e) {}
  };
  
  const handleUpdateLeadStatus = async (id: number, status: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch(e) {}
  };
  
  const handleUpdateAffiliateStatus = async (id: number, status: string) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/admin/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch(e) {}
  };

  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await user?.getIdToken() || localStorage.getItem('custom_token') || 'mock-admin-token';
      await fetch('/api-v2/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUserForm)
      });
      setAddingUser(false);
      setNewUserForm({ email: '', password: '', companyName: '', role: 'seller' });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          role: editingUser.role, 
          verificationStatus: editingUser.verificationStatus,
          companyName: editingUser.companyName,
          teamOwnerId: editingUser.teamOwnerId,
          email: editingUser.email,
          displayName: editingUser.displayName
        })
      });
      setEditingUser(null);
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch(`/api-v2/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          sellerId: editingProduct.sellerId,
          title: editingProduct.title, 
          description: editingProduct.description,
          moq: editingProduct.moq, 
          originType: editingProduct.originType,
          shippingOptions: editingProduct.shippingOptions || [],
          images: editingProduct.images || [],
          approvalStatus: editingProduct.approvalStatus,
          categoryId: editingProduct.categoryId,
          isSponsored: editingProduct.isSponsored
        })
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchAdminData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update listing");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading Admin Panel...</div>;

  return (
    <div className="space-y-8 relative pb-20">
      <div className="flex items-center space-x-3 text-slate-100 mb-2">
        <div className="p-2.5 bg-accent/10 rounded-xl">
          <ShieldAlert className="w-7 h-7 text-[#ffcc00]" />
        </div>
        <h1 className="heading-xl font-display">Platform Administration</h1>
      </div>
      
      <div className="flex space-x-6 border-b border-slate-700 mb-8 overflow-x-auto">
         {['overview', 'approvals', 'users', 'marketing', 'affiliates', 'leads', 'feedback'].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`pb-3 font-semibold tracking-tight text-sm capitalize whitespace-nowrap transition-colors border-b-2 ${activeTab === tab ? 'border-ink text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-100 hover:border-ink/30'}`}
           >
             {tab === 'users' ? 'User Directory' : tab}
           </button>
         ))}
      </div>


      
      {activeTab === 'overview' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center space-x-4 hover:border-ink/20 transition-colors">
          <div className="p-3 bg-accent/5 text-[#ffcc00] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Total Users</div>
            <div className="text-3xl font-extrabold text-white text-slate-100">{stats?.userCount || 0}</div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center space-x-4 hover:border-ink/20 transition-colors">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Active Listings</div>
            <div className="text-3xl font-extrabold text-white text-slate-100">{stats?.productCount || 0}</div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex items-center space-x-4 hover:border-ink/20 transition-colors">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Active RFQs</div>
            <div className="text-3xl font-extrabold text-white text-slate-100">{stats?.inquiryCount || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="bg-slate-900 p-5 border-b border-slate-700 flex items-center">
               <h2 className="text-2xl font-bold text-white">Manage Users</h2>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
               {(stats?.recentUsers || []).map((u: any) => (
                 <div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-900 transition-colors">
                    <div>
                       <div className="font-medium text-slate-100">{u.email}</div>
                       <div className="text-xs text-slate-400 mt-1">{u.companyName || 'No Company'} • {u.role}</div>
                       <span className="text-[10px] font-semibold tracking-tight px-2 py-0.5 bg-slate-900 rounded-full text-slate-400 uppercase tracking-wide inline-block mt-2 border border-slate-700">
                          {u.verificationStatus}
                       </span>
                    </div>
                    <div className="flex space-x-1">
                       <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="bg-slate-900 p-5 border-b border-slate-700 flex items-center">
               <h2 className="text-2xl font-bold text-white">Manage Listings</h2>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto">
               {(stats?.recentProducts || []).map((p: any) => (
                 <div key={p.id} className="p-4 flex justify-between items-start hover:bg-slate-900 transition-colors">
                    <div className="flex-1 pr-4">
                       <div className="font-medium text-slate-100 line-clamp-1">
                          {p.title}
                          {p.approvalStatus === 'pending' && <span className="ml-2 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] uppercase font-semibold tracking-tight rounded-full">Pending</span>}
                          {p.approvalStatus === 'rejected' && <span className="ml-2 px-2 py-0.5 bg-red-50 border border-red-200 text-red-800 text-[10px] uppercase font-semibold tracking-tight rounded-full">Rejected</span>}
                       </div>
                       <div className="text-xs text-slate-400 mt-1">Seller ID: {p.sellerId} • MOQ: {p.moq}</div>
                       <div className="text-xs text-slate-400 mt-1">{p.originType}</div>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                       <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
      <CategoryManagement />

      
        </>
      )}


      {activeTab === 'feedback' && (
        <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">User Feedback & Bug Reports</h2>
              <p className="text-sm text-slate-400 mt-1">Note: we can manually edit usernames for users as admins.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedback.map(f => (
                  <tr key={f.id} className="hover:bg-slate-900">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{f.user ? `${f.user.companyName || 'Unknown'} (${f.user.email})` : 'Anonymous'}</td>
                    <td className="px-4 py-3 font-medium text-slate-400">{f.type}</td>
                    <td className="px-4 py-3 min-w-[300px]">{f.message}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold tracking-tight uppercase ${f.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {f.status === 'Pending' ? (
                        <button onClick={() => handleUpdateFeedback(f.id, 'Resolved')} className="text-[#ffcc00] hover:text-slate-100 font-semibold tracking-tight text-xs bg-slate-700 px-2 py-1 rounded border border-slate-700">
                          Mark Resolved
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateFeedback(f.id, 'Pending')} className="text-slate-400 hover:text-slate-400 font-semibold tracking-tight text-xs">
                          Undo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {feedback.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No feedback submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-8">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
             <div className="p-5 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Pending Name Changes</h3>
             </div>
             <div className="divide-y divide-slate-100">
                {!approvals.pendingUsers || approvals.pendingUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No pending name changes.</div>
                ) : approvals.pendingUsers.map((u: any) => (
                  <div key={u.id} className="p-6 flex items-center justify-between">
                     <div>
                        <div className="font-semibold tracking-tight text-slate-100">{u.email}</div>
                        <div className="text-sm mt-1">
                          Current Company: <span className="font-mono bg-slate-900 px-1">{u.companyName || 'None'}</span> &rarr; <span className="font-semibold tracking-tight text-[#ffcc00]">{u.pendingCompanyName || '(No Change)'}</span>
                        </div>
                        <div className="text-sm">
                          Current Name: <span className="font-mono bg-slate-900 px-1">{u.displayName || 'None'}</span> &rarr; <span className="font-semibold tracking-tight text-[#ffcc00]">{u.pendingDisplayName || '(No Change)'}</span>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={async () => {
                           let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                           await fetch(`/api-v2/admin/approvals/users/${u.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ action: 'approve' })
                           });
                           window.location.reload();
                        }} className="px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold tracking-tight text-sm">Approve</button>
                        <button onClick={async () => {
                           let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                           await fetch(`/api-v2/admin/approvals/users/${u.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ action: 'reject' })
                           });
                           window.location.reload();
                        }} className="px-3 py-1.5 bg-rose-600 text-white rounded font-semibold tracking-tight text-sm">Reject</button>
                     </div>
                  </div>
                ))}
             </div>
           </div>
           
           <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
             <div className="p-5 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Pending Product Approvals</h3>
             </div>
             <div className="divide-y divide-slate-100">
                {!approvals.pendingProducts || approvals.pendingProducts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No pending products.</div>
                ) : approvals.pendingProducts.map((p: any) => (
                  <div key={p.id} className="p-6 flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                         <div>
                            <div className="font-semibold tracking-tight text-slate-100 text-lg">{p.title}</div>
                            <div className="text-sm text-slate-400 mt-1 line-clamp-2">{p.description}</div>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={async () => {
                               let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                               await fetch(`/api-v2/admin/products/${p.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ approvalStatus: 'approved' })
                               });
                               window.location.reload();
                            }} className="px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold tracking-tight text-sm">Approve</button>
                            <button onClick={async () => {
                               let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                               await fetch(`/api-v2/admin/products/${p.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ approvalStatus: 'rejected' })
                               });
                               window.location.reload();
                            }} className="px-3 py-1.5 bg-rose-600 text-white rounded font-semibold tracking-tight text-sm">Reject</button>
                         </div>
                     </div>
                  </div>
                ))}
             </div>
           </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 p-5 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">User Directory ({stats?.recentUsers?.length || 0} Total)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Name / Email</th>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.recentUsers || []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-900">
                    <td className="px-4 py-3 font-mono text-slate-400">{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold tracking-tight text-slate-100">{u.displayName || 'No Name'}</div>
                      <div className="text-slate-400 text-sm font-medium">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                       <div className="font-semibold tracking-tight text-slate-100">{u.companyName || '--'}</div>
                       {u.teamOwnerId && <div className="text-xs text-[#ffcc00] font-semibold tracking-tight bg-slate-700 px-2 py-0.5 rounded inline-block mt-1">Team Member</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold tracking-tight ${
                        u.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                        u.role === 'seller' ? 'bg-slate-700 text-slate-100' :
                        u.role === 'both' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-900 text-slate-400'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">{u.verificationStatus}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => setEditingUser(u)} className="text-[#ffcc00] font-semibold tracking-tight hover:underline">Edit User</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'marketing' && (
        <div className="space-y-6">
           <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 p-6">
             <h3 className="font-semibold tracking-tight text-lg text-slate-100 mb-4">Chat / Notes & Marketing Broadcast</h3>
             <form onSubmit={handleSendMarketing} className="space-y-4">
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Campaign Name</label>
                 <input type="text" required value={marketingForm.campaignName} onChange={e => setMarketingForm({...marketingForm, campaignName: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="e.g. Summer TCG Accessories Promo" />
               </div>
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Target Segment</label>
                 <select required value={marketingForm.targetSegment} onChange={e => setMarketingForm({...marketingForm, targetSegment: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                   <option value="">Select Segment...</option>
                   <option value="All Buyers">All Buyers</option>
                   <option value="Unverified Sellers">Unverified Sellers</option>
                   <option value="Verified Distributors">Verified Distributors</option>
                   <option value="Newsletter Opt-ins">Newsletter Opt-ins</option>
                   <option value="Internal Note / Journal">Internal Note / Journal</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Message Content (HTML allowed)</label>
                 <textarea required rows={5} value={marketingForm.messageContent} onChange={e => setMarketingForm({...marketingForm, messageContent: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Write your marketing email here..."></textarea>
               </div>
               <button type="submit" className="px-6 py-2 bg-ink text-white font-semibold tracking-tight rounded-xl hover:bg-ink-light">Save Note / Send Campaign</button>
             </form>
           </div>
           
           <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 overflow-hidden">
             <div className="bg-slate-900 p-4 border-b border-slate-700 font-semibold tracking-tight text-slate-100">
               Marketing Activity Logs & Journal
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Segment</th>
                    <th className="px-4 py-3">Recipients</th>
                    <th className="px-4 py-3">Content Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marketingLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-900 cursor-pointer" onClick={() => setViewingLog(log)}>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(log.dateSent).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{log.campaignName}</td>
                      <td className="px-4 py-3">{log.targetSegment}</td>
                      <td className="px-4 py-3 font-mono">{log.recipientCount}</td>
                      <td className="px-4 py-3 truncate max-w-[200px]">{log.messageContent}</td>
                    </tr>
                  ))}
                  {marketingLogs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No marketing campaigns sent yet.</td></tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'affiliates' && (
        <div className="space-y-6">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
             <h3 className="text-2xl font-bold text-white mb-4">Add High-Grade Seller Lead</h3>
             <form onSubmit={handleAddAffiliate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Name</label>
                 <input type="text" required value={affiliateForm.companyName} onChange={e => setAffiliateForm({...affiliateForm, companyName: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Acme TCG Corp" />
               </div>
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Contact Email</label>
                 <input type="email" required value={affiliateForm.contactEmail} onChange={e => setAffiliateForm({...affiliateForm, contactEmail: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="sales@acme.com" />
               </div>
               <div>
                 <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Website (Optional)</label>
                 <input type="text" value={affiliateForm.website} onChange={e => setAffiliateForm({...affiliateForm, website: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="https://acme.com" />
               </div>
               <button type="submit" className="md:col-span-3 px-6 py-2 bg-emerald-600 text-white font-semibold tracking-tight rounded-xl hover:bg-emerald-700">Add Affiliate Lead</button>
             </form>
           </div>
           
           <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
             <div className="bg-slate-900 p-5 border-b border-slate-700 flex items-center">
               <h3 className="text-2xl font-bold text-white">Affiliate CRM (Seller Outreach)</h3>
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Website</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {affiliates.map((aff: any) => (
                    <tr key={aff.id} className="hover:bg-slate-900">
                      <td className="px-4 py-3 font-medium">{aff.companyName}</td>
                      <td className="px-4 py-3">{aff.contactEmail}</td>
                      <td className="px-4 py-3 text-[#ffcc00] hover:underline"><a href={aff.website} target="_blank">{aff.website}</a></td>
                      <td className="px-4 py-3">
                        <select 
                          value={aff.status} 
                          onChange={(e) => handleUpdateAffiliateStatus(aff.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-semibold tracking-tight ${
                            aff.status === 'Onboarded' ? 'bg-emerald-50 text-emerald-700' :
                            aff.status === 'Declined' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <option value="Lead">Lead</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Negotiating">Negotiating</option>
                          <option value="Onboarded">Onboarded</option>
                          <option value="Declined">Declined</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(aff.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {affiliates.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No affiliates tracked yet.</td></tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>
      )}

      
      {activeTab === 'leads' && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-none flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <div className="text-sm text-slate-400 font-medium mb-2">B2B Outreach Pipeline (Smartlead/Instantly)</div>
                <div className="text-4xl font-black text-[#ffcc00] mb-2">{sentCount} <span className="text-xl text-slate-400">/ 20,000</span></div>
                <div className="w-full bg-slate-900 rounded-full h-4 mt-2 overflow-hidden border border-slate-700">
                  <div className="bg-ink h-4 rounded-full transition-all" style={{ width: `${Math.min(50, (sentCount / 20000) * 50)}%` }}></div>
                </div>
                <div className="text-xs text-slate-400 mt-3 font-medium text-center">
                  Status: Workspace Domains Rotated & Active.<br/>
                  NeverBounce Verification Active.<br/>
                  Limit: 50 emails/day/inbox for deliverability health.
                </div>
             </div>
             
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-none">
                <div className="flex flex-col mb-4">
                   <div className="flex justify-between items-center mb-2">
                     <h3 className="font-semibold tracking-tight text-slate-100">Export Next Batch (50) to CRM</h3>
                     <label className="cursor-pointer text-[#ffcc00] text-sm font-semibold tracking-tight bg-slate-700 hover:bg-slate-700 px-3 py-1 rounded transition-colors whitespace-nowrap">
                        Upload CSV (.csv)
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           Papa.parse(file, {
                              header: true,
                              skipEmptyLines: true,
                              transformHeader: (header) => header.trim(),
                              complete: async (results) => {
                                 try {
                                    let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                                    setUploading(true);
                                    const res = await fetch('/api-v2/admin/leads/upload', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                       body: JSON.stringify({ leads: results.data })
                                    });
                                    if (res.ok) {
                                       const data = await res.json();
                                       fetchAdminData();
                                       toast.success(`Imported ${data.added || 0} new leads. Duplicates were ignored.`);
                                    } else {
                                       toast.error('Failed to import leads');
                                    }
                                 } catch (err) {
                                    toast.error('Error importing leads');
                                 } finally {
                                    setUploading(false);
                                 }
                              }
                           });
                        }} />
                     </label>
                   </div>
                   <p className="text-xs text-slate-400 mb-1">Upload CSV with headers: Business Name, City, State, Email 1, Website...</p>
                </div>
                <p className="text-xs text-slate-400 mb-6">Integrates with Resend API. Will automatically select 50 pending leads.</p>
                <div className="flex flex-col gap-3 mt-auto">
                  <button disabled={sending} onClick={async () => {
                    let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                    const res = await fetch('/api-v2/admin/leads/preview', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    setPreviewingHtml(data.html);
                  }} className="px-4 py-2 bg-slate-900 text-slate-400 font-semibold tracking-tight rounded-xl hover:bg-slate-800 w-full">
                    Preview Template
                  </button>
                  <button disabled={sending} onClick={async () => {
                    if (!confirm('Send 50 emails now?')) return;
                    setSending(true);
                    try {
                        let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                        // Find 50 pending
                        const pendingIds = leads.filter((l:any) => l.status === 'pending' || !l.status).slice(0, 50).map((l:any) => l.id);
                        if(pendingIds.length === 0) { toast.error('No pending leads.'); setSending(false); return; }
                        await fetch('/api-v2/admin/leads/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ limit: 50 })
                        });
                        fetchAdminData();
                    } finally {
                        setSending(false);
                    }
                  }} className="px-4 py-2 bg-ink text-white font-semibold tracking-tight rounded-xl hover:bg-ink-light w-full">
                    {sending ? 'Sending...' : 'Send 50 Mails'}
                  </button>
                </div>
             </div>
           </div>

           <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 overflow-hidden">
             <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center justify-between">
               <span className="font-semibold tracking-tight text-slate-100">Lead Database</span>
               <div className="flex space-x-2">
                  <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm font-semibold text-slate-400 outline-none">
                     <option value="all">All Segments</option>
                     <option value="TCG">TCG</option>
                     <option value="Sports">Sports</option>
                     <option value="General">General</option>
                  </select>
                  <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm font-semibold text-slate-400 outline-none">
                     <option value="to-send">To-Send (Pending)</option>
                     <option value="recruited">Recruited</option>
                     <option value="sent">Sent (Not Recruited)</option>
                     <option value="all">All Status</option>
                  </select>
               </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase">
                   <tr>
                     <th className="px-4 py-3">Company</th>
                     <th className="px-4 py-3">Segment</th>
                     <th className="px-4 py-3">Email</th>
                     <th className="px-4 py-3">Website</th>
                     <th className="px-4 py-3">Status</th>
                     <th className="px-4 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-slate-400">
                   {leads.filter((l:any) => {
                      if(segmentFilter !== 'all' && (l.segment || 'TCG') !== segmentFilter) return false;
                      if(leadFilter === 'all') return true;
                      if(leadFilter === 'to-send') return l.status === 'pending' || !l.status;
                      return l.status === leadFilter;
                   }).map((lead: any) => (
                     <tr key={lead.id} className="hover:bg-slate-900">
                       <td className="px-4 py-3 font-semibold">{lead.companyName || 'N/A'}</td>
                       <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">{lead.segment || 'TCG'}</td>
                       <td className="px-4 py-3">{lead.email}</td>
                       <td className="px-4 py-3">
                         {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-[#ffcc00] hover:underline">Link</a> : '-'}
                       </td>
                       <td className="px-4 py-3">
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold tracking-tight ${lead.status === 'recruited' ? 'bg-emerald-50 text-emerald-700' : lead.status === 'sent' ? 'bg-blue-50 text-blue-700' : 'bg-slate-900 text-slate-400'}`}>
                           {(lead.status || 'pending').toUpperCase()}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-right">
                          {lead.status !== 'recruited' && (
                            <button onClick={() => handleUpdateLeadStatus(lead.id, 'recruited')} className="text-emerald-600 hover:text-emerald-800 font-semibold tracking-tight text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                               Mark Recruited
                            </button>
                          )}
                          {lead.status === 'recruited' && (
                            <button onClick={() => handleUpdateLeadStatus(lead.id, 'pending')} className="text-slate-400 hover:text-slate-400 font-semibold tracking-tight text-xs ml-2">
                               Undo
                            </button>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {viewingLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900">
              <div>
                 <h3 className="font-semibold tracking-tight text-slate-100">{viewingLog.campaignName}</h3>
                 <span className="text-xs font-mono text-slate-400">{new Date(viewingLog.dateSent).toLocaleString()} - {viewingLog.targetSegment}</span>
              </div>
              <button onClick={() => setViewingLog(null)} className="text-slate-400 hover:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="whitespace-pre-wrap text-slate-400 text-sm leading-relaxed">{viewingLog.messageContent}</div>
            </div>
          </div>
        </div>
      )}

      
      {previewingHtml && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 w-full h-full max-w-7xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900">
              <div>
                 <h3 className="font-semibold tracking-tight text-slate-100">Email Template Preview</h3>
                 <p className="text-xs text-slate-400">Variables like {'{companyNameStr}'} are populated with test data</p>
              </div>
              <button onClick={() => setPreviewingHtml(null)} className="text-slate-400 hover:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-900">
               <iframe srcDoc={previewingHtml} className="w-full h-full border-none" title="Email Preview" />
            </div>
          </div>
        </div>
      )}

      {addingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-none w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-semibold tracking-tight text-lg">Create New User</h3>
              <button onClick={() => setAddingUser(false)} className="text-slate-400 hover:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Email</label>
                <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Password</label>
                <input required type="text" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Name</label>
                <input required type="text" value={newUserForm.companyName} onChange={e => setNewUserForm({...newUserForm, companyName: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Role</label>
                <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl outline-none">
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="both">Both</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-ink text-white rounded-xl font-semibold tracking-tight hover:bg-ink-light">Create Account</button>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900">
              <h3 className="font-semibold tracking-tight text-slate-100">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Email</label>
                <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Display Name</label>
                <input type="text" value={editingUser.displayName || ''} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Role</label>
                <select 
                  value={editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="both">Both</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
                            <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={editingUser.companyName || ''} 
                  onChange={e => setEditingUser({...editingUser, companyName: e.target.value})} 
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" 
                  placeholder="Leave blank if team member"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Select Company (Join Team)</label>
                <select 
                  value={editingUser.teamOwnerId || ''} 
                  onChange={e => setEditingUser({...editingUser, teamOwnerId: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  <option value="">No Team (Independent)</option>
                  {(stats?.recentUsers || []).filter(u => u.companyName && u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.companyName} (Owner: {u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Status</label>
                <select 
                  value={editingUser.verificationStatus} 
                  onChange={e => setEditingUser({...editingUser, verificationStatus: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-400 hover:bg-slate-900 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-ink text-white rounded-xl hover:bg-ink-light font-medium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-none border border-slate-700 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900">
              <h3 className="font-semibold tracking-tight text-slate-100">Edit Listing</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Seller (Lister)</label>
                <select 
                  value={editingProduct.sellerId} 
                  onChange={e => setEditingProduct({...editingProduct, sellerId: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  {(stats?.recentUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.companyName || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Category</label>
                <select 
                  value={editingProduct.categoryId || ''} 
                  onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  <option value="">No Category</option>
                  {stats?.categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Approval Status</label>
                <select 
                  value={editingProduct.approvalStatus} 
                  onChange={e => setEditingProduct({...editingProduct, approvalStatus: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none font-medium"
                >
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={editingProduct.isSponsored || false} onChange={e => setEditingProduct({...editingProduct, isSponsored: e.target.checked})} className="form-checkbox h-5 w-5 text-[#ffcc00] rounded border-slate-700 focus:ring-ink" />
                  <span className="text-sm font-semibold tracking-tight text-slate-400">Sponsored Product</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Title</label>
                <input 
                  type="text" required
                  value={editingProduct.title} 
                  onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Description</label>
                <textarea 
                  required rows={2}
                  value={editingProduct.description} 
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
              <ImageUploader 
                 images={editingProduct.images || []}
                 onChange={imgs => setEditingProduct({...editingProduct, images: imgs})}
              />
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Primary MOQ</label>
                <input 
                  type="number" min="1" required
                  value={editingProduct.moq} 
                  onChange={e => setEditingProduct({...editingProduct, moq: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
              
              <div className="pt-2 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-semibold tracking-tight text-slate-400">Shipping Tiers & Origins</label>
                   <button type="button" onClick={() => {
                     const opts = editingProduct.shippingOptions || [];
                     setEditingProduct({...editingProduct, shippingOptions: [...opts, { type: 'Warehouse', country: '', moq: 1, leadTimeDays: 1 }]});
                   }} className="text-xs bg-slate-700 text-slate-100 px-2 py-1 rounded font-medium">+ Add Tier</button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                   {(editingProduct.shippingOptions || []).map((opt: any, i: number) => (
                     <div key={i} className="flex space-x-2 p-2 bg-slate-900 border border-slate-700 rounded-xl">
                       <select value={opt.type} onChange={e => {
                         const n = [...editingProduct.shippingOptions]; n[i].type = e.target.value; setEditingProduct({...editingProduct, shippingOptions: n});
                       }} className="w-1/3 text-sm px-2 border border-slate-700 rounded">
                         <option value="Warehouse">Warehouse</option>
                         <option value="Factory">Factory</option>
                       </select>
                       <input type="text" placeholder="Country" value={opt.country} onChange={e => {
                         const n = [...editingProduct.shippingOptions]; n[i].country = e.target.value; setEditingProduct({...editingProduct, shippingOptions: n});
                       }} className="w-1/3 text-sm px-2 border border-slate-700 rounded" />
                       <input type="number" placeholder="MOQ" value={opt.moq} onChange={e => {
                         const n = [...editingProduct.shippingOptions]; n[i].moq = parseInt(e.target.value); setEditingProduct({...editingProduct, shippingOptions: n});
                       }} className="w-1/6 text-sm px-2 border border-slate-700 rounded" />
                       <button type="button" onClick={() => {
                         const n = [...editingProduct.shippingOptions]; n.splice(i, 1); setEditingProduct({...editingProduct, shippingOptions: n});
                       }} className="w-1/6 text-sm text-red-500 hover:text-red-700 font-semibold tracking-tight">X</button>
                     </div>
                   ))}
                   {!(editingProduct.shippingOptions || []).length && (
                     <div className="text-xs text-slate-400 text-center py-2">No custom shipping tiers. Add one below.</div>
                   )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Primary Origin Note</label>
                <select 
                  value={editingProduct.originType} 
                  onChange={e => setEditingProduct({...editingProduct, originType: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none"
                >
                  <option value="Direct Factory">Direct Factory</option>
                  <option value="Verified EU Carrier/Warehouse">Verified EU Carrier/Warehouse</option>
                  <option value="Global Distributor">Global Distributor</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-slate-400 hover:bg-slate-900 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-ink text-white rounded-xl hover:bg-ink-light font-medium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
