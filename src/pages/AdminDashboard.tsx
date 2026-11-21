import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Package,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Plus,
  Search,
  Lock,
  ExternalLink,
  RefreshCw,
  FolderTree,
  UserCheck,
  Store,
  Mail,
  MessageSquare,
  X,
  Check,
  ChevronRight,
  Globe,
  ShoppingBag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, getAdminAuthHeaders } from '../components/AuthContext.tsx';
import { AdminSverigeTab } from '../components/AdminSverigeTab.tsx';
import { AdminListings } from '../components/AdminListings.tsx';
import { AdminKortButikerTab } from '../components/AdminKortButikerTab.tsx';
import { AdminLeadsTab } from '../components/AdminLeadsTab.tsx';
import { ImageUploader } from '../components/ImageUploader.tsx';
import { ORIGIN_TYPES } from '../lib/productTaxonomy.ts';

type AdminWorkspace =
  | 'b2c-store'
  | 'b2b-catalog'
  | 'approvals-users'
  | 'outreach-crm'
  | 'categories-feedback';

function CategoryManagerSection({ adminHeaders }: { adminHeaders: () => Promise<Record<string, string>> }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api-v2/categories');
      if (res.ok) setCategories(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = editing || adding;
    if (!target) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const url = editing ? `/api-v2/categories/${editing.id}` : '/api-v2/categories';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(target),
      });
      if (!res.ok) throw new Error('Failed to save category');
      toast.success(t('Category saved'));
      setEditing(null);
      setAdding(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Could not save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api-v2/categories/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        toast.success(t('Category deleted'));
        fetchCategories();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">{t('Store & B2B Categories')}</h3>
            <p className="text-xs text-slate-400">
              {t('Manage product taxonomy categories used across Hatake.Shop and B2B.Hatake.Shop')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setAdding({
              name: '',
              slug: '',
              parentId: null,
              sortOrder: 0,
              isVisibleIfEmpty: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('New Category')}</span>
        </button>
      </div>

      <div className="divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{t('No categories created yet.')}</div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{c.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                    /{c.slug}
                  </span>
                  {c.isVisibleIfEmpty && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                      {t('Always Visible')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ID: #{c.id} · Sort: {c.sortOrder ?? 0}
                  {c.parentId ? ` · Parent #${c.parentId}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={t('Edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title={t('Delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {(editing || adding) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setEditing(null);
              setAdding(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-black text-white text-base">
                  {editing ? t('Edit Category') : t('Create Category')}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setAdding(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Category Name')}
                  </label>
                  <input
                    required
                    type="text"
                    value={(editing || adding).name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const slug = val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                      if (editing) setEditing({ ...editing, name: val });
                      else setAdding({ ...adding, name: val, slug: adding.slug || slug });
                    }}
                    placeholder="e.g. Booster Boxes"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('URL Slug')}
                  </label>
                  <input
                    required
                    type="text"
                    value={(editing || adding).slug || ''}
                    onChange={(e) =>
                      editing
                        ? setEditing({ ...editing, slug: e.target.value })
                        : setAdding({ ...adding, slug: e.target.value })
                    }
                    placeholder="booster-boxes"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Parent Category')}
                    </label>
                    <select
                      value={(editing || adding).parentId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        if (editing) setEditing({ ...editing, parentId: val });
                        else setAdding({ ...adding, parentId: val });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">{t('None (Top-Level)')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Sort Order')}
                    </label>
                    <input
                      type="number"
                      value={(editing || adding).sortOrder || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        if (editing) setEditing({ ...editing, sortOrder: val });
                        else setAdding({ ...adding, sortOrder: val });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((editing || adding).isVisibleIfEmpty)}
                    onChange={(e) =>
                      editing
                        ? setEditing({ ...editing, isVisibleIfEmpty: e.target.checked })
                        : setAdding({ ...adding, isVisibleIfEmpty: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs font-bold text-slate-300">
                    {t('Show category even when it has 0 products')}
                  </span>
                </label>
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setAdding(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all"
                  >
                    {saving ? t('Saving...') : t('Save Category')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user, lockAdminSession } = useAuth();

  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspace>('b2c-store');
  const [crmSubTab, setCrmSubTab] = useState<'kort-butiker' | 'leads' | 'affiliates' | 'broadcast'>('kort-butiker');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<{
    pendingSellers: any[];
    pendingUsers: any[];
    pendingProducts: any[];
  }>({ pendingSellers: [], pendingUsers: [], pendingProducts: [] });
  const [feedback, setFeedback] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [marketingLogs, setMarketingLogs] = useState<any[]>([]);
  const [previewingHtml, setPreviewingHtml] = useState<string | null>(null);

  // User Directory Filter & Modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [addingUser, setAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    companyName: '',
    role: 'seller',
  });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Affiliates & Broadcast state
  const [affiliateForm, setAffiliateForm] = useState({
    companyName: '',
    contactEmail: '',
    website: '',
  });
  const [marketingForm, setMarketingForm] = useState({
    campaignName: '',
    targetSegment: '',
    messageContent: '',
  });

  const getHeaders = useCallback(async () => {
    let tok = '';
    try {
      tok = (await user?.getIdToken()) || '';
    } catch {}
    return getAdminAuthHeaders(tok);
  }, [user]);

  const fetchAdminData = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) return await res.json();
          return null;
        } catch {
          return null;
        }
      };

      const [statsData, catData, approvalsData, fbData, leadsData, affData, mktData] =
        await Promise.all([
          safeFetch('/api-v2/admin/stats'),
          safeFetch('/api-v2/categories'),
          safeFetch('/api-v2/admin/approvals'),
          safeFetch('/api-v2/admin/feedback'),
          safeFetch('/api-v2/admin/leads'),
          safeFetch('/api-v2/admin/affiliates'),
          safeFetch('/api-v2/admin/marketing'),
        ]);

      if (statsData) setStats(statsData);
      if (catData) setCategories(catData);
      if (approvalsData) setApprovals(approvalsData);
      if (Array.isArray(fbData)) setFeedback(fbData);
      if (leadsData) {
        const leadsArr = Array.isArray(leadsData) ? leadsData : leadsData.leads || [];
        setLeads(leadsArr);
      }
      if (Array.isArray(affData)) setAffiliates(affData);
      if (Array.isArray(mktData)) setMarketingLogs(mktData);
    } catch (e: any) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Computed counts
  const pendingApprovalCount =
    (approvals.pendingSellers?.length || 0) +
    (approvals.pendingProducts?.length || 0) +
    (approvals.pendingUsers?.length || 0);

  const b2cProductsCount = useMemo(() => {
    const recent = stats?.recentProducts || [];
    return recent.filter((p: any) => p.isSverigeB2c).length;
  }, [stats]);

  const filteredUsers = useMemo(() => {
    const all = stats?.recentUsers || [];
    return all.filter((u: any) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.companyName?.toLowerCase().includes(q)
      );
    });
  }, [stats, userSearch, userRoleFilter]);

  // Handlers
  const handleSellerApproval = async (sellerId: number, action: 'approve' | 'reject' | 'set_tier', tier?: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/approvals/sellers/${sellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, tier }),
      });
      if (res.ok) {
        toast.success(t('Supplier status updated'));
        fetchAdminData();
      } else {
        toast.error(t('Failed to update supplier status'));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleProductApproval = async (productId: number, approvalStatus: 'approved' | 'rejected') => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ approvalStatus }),
      });
      if (res.ok) {
        toast.success(
          approvalStatus === 'approved' ? t('Product approved') : t('Product rejected')
        );
        fetchAdminData();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await getHeaders();
      const res = await fetch('/api-v2/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(newUserForm),
      });
      if (!res.ok) throw new Error('Failed to create user');
      toast.success(t('User created'));
      setAddingUser(false);
      setNewUserForm({ email: '', password: '', companyName: '', role: 'seller' });
      fetchAdminData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          role: editingUser.role,
          verificationStatus: editingUser.verificationStatus,
          companyName: editingUser.companyName,
          teamOwnerId: editingUser.teamOwnerId,
          email: editingUser.email,
          displayName: editingUser.displayName,
          orgNumber: editingUser.orgNumber,
          website: editingUser.website,
          aboutUs: editingUser.aboutUs,
          country: editingUser.country,
          region: editingUser.region,
          companyFocus: editingUser.companyFocus,
          vatNumber: editingUser.vatNumber,
          profilePictureUrl: editingUser.profilePictureUrl,
          bannerUrl: editingUser.bannerUrl,
        }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      toast.success(t('User profile updated'));
      setEditingUser(null);
      fetchAdminData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/users/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        toast.success(t('User removed'));
        fetchAdminData();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
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
          isSponsored: editingProduct.isSponsored,
        }),
      });
      if (res.ok) {
        toast.success(t('Product updated'));
        setEditingProduct(null);
        fetchAdminData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update product');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateFeedback = async (id: number, status: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api-v2/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
        toast.success(t('Feedback updated'));
      }
    } catch {}
  };

  const handleAddAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await getHeaders();
      const res = await fetch('/api-v2/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(affiliateForm),
      });
      if (res.ok) {
        toast.success(t('Affiliate lead added'));
        setAffiliateForm({ companyName: '', contactEmail: '', website: '' });
        fetchAdminData();
      }
    } catch {}
  };

  const handleUpdateAffiliateStatus = async (id: number, status: string) => {
    try {
      const headers = await getHeaders();
      await fetch(`/api-v2/admin/affiliates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status }),
      });
      fetchAdminData();
    } catch {}
  };

  const handleSendMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await getHeaders();
      const res = await fetch('/api-v2/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(marketingForm),
      });
      if (res.ok) {
        toast.success(t('Campaign / note saved'));
        setMarketingForm({ campaignName: '', targetSegment: '', messageContent: '' });
        fetchAdminData();
      }
    } catch {}
  };

  const WORKSPACES: {
    id: AdminWorkspace;
    title: string;
    subtitle: string;
    icon: any;
    badge?: number | string;
    accent: string;
  }[] = [
    {
      id: 'b2c-store',
      title: '🇸🇪 Hatake.Shop (B2C)',
      subtitle: t('Swedish Storefront & Products'),
      icon: ShoppingBag,
      accent: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/40 text-cyan-400',
    },
    {
      id: 'b2b-catalog',
      title: '🌐 B2B Wholesale Catalog',
      subtitle: t('Wholesale Listings & Bulk Tools'),
      icon: Building2,
      badge: stats?.productCount || 0,
      accent: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400',
    },
    {
      id: 'approvals-users',
      title: t('Users & KYB Approvals'),
      subtitle: t('Accounts, Roles & Verification'),
      icon: Users,
      badge: pendingApprovalCount > 0 ? `${pendingApprovalCount} !` : stats?.userCount || 0,
      accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
    },
    {
      id: 'outreach-crm',
      title: t('B2B Outreach & Kortbutiker'),
      subtitle: t('Swedish Card Shops & Lead CRM'),
      icon: Store,
      badge: leads.length || undefined,
      accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400',
    },
    {
      id: 'categories-feedback',
      title: t('Categories & Feedback'),
      subtitle: t('Taxonomy & Bug Reports'),
      icon: FolderTree,
      badge: categories.length || undefined,
      accent: 'from-rose-500/20 to-pink-500/10 border-rose-500/40 text-rose-400',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">{t('Laddar Hatake Admin Command Center...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ==================== TOP COMMAND HEADER ==================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {t('Hatake Admin Command Center')}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold">
                  <Lock className="w-3 h-3" />
                  <span>ADMIN_PASSWORD UNLOCKED</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {t(
                  'Unified administration for hatake.shop (Swedish B2C Storefront) & b2b.hatake.shop (International B2B Wholesale)'
                )}
              </p>
            </div>
          </div>

          {/* Live KPI Pills + Lock Session Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-2.5">
              <Package className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {t('Total Listings')}
                </div>
                <div className="text-sm font-black text-white tabular-nums">
                  {stats?.productCount || 0}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-2.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {t('Accounts')}
                </div>
                <div className="text-sm font-black text-white tabular-nums">
                  {stats?.userCount || 0}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {t('Active RFQs')}
                </div>
                <div className="text-sm font-black text-white tabular-nums">
                  {stats?.inquiryCount || 0}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchAdminData}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title={t('Refresh Data')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                lockAdminSession();
                toast.success(t('Admin session locked'));
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-extrabold transition-colors cursor-pointer"
              title={t('Lock Admin Panel')}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('Lock Admin')}</span>
            </button>
          </div>
        </div>

        {/* ==================== 5 CONCRETE WORKSPACE PILLARS ==================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-6">
          {WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            const active = activeWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => setActiveWorkspace(ws.id)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                  active
                    ? `bg-gradient-to-br ${ws.accent} shadow-lg`
                    : 'bg-slate-950/60 border-slate-800/90 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-black text-white truncate">
                      {ws.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{ws.subtitle}</p>
                </div>
                {ws.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      active
                        ? 'bg-slate-950/70 text-white border border-white/20'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ws.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== WORKSPACE 1: HATAKE.SHOP (B2C SVERIGE) ==================== */}
      {activeWorkspace === 'b2c-store' && (
        <motion.div
          key="b2c-store"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <AdminSverigeTab />
        </motion.div>
      )}

      {/* ==================== WORKSPACE 2: B2B WHOLESALE CATALOG ==================== */}
      {activeWorkspace === 'b2b-catalog' && (
        <motion.div
          key="b2b-catalog"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <AdminListings />
        </motion.div>
      )}

      {/* ==================== WORKSPACE 3: USERS & KYB APPROVALS ==================== */}
      {activeWorkspace === 'approvals-users' && (
        <motion.div
          key="approvals-users"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Pending KYB & Product Approvals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Seller KYB Verification */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-black text-white">
                      {t('Pending Supplier Verifications (KYB)')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('Approve or assign supplier tiers for wholesale accounts')}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                  {approvals.pendingSellers?.length || 0}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                {!approvals.pendingSellers || approvals.pendingSellers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {t('No pending supplier KYB applications.')}
                  </div>
                ) : (
                  approvals.pendingSellers.map((u: any) => (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40"
                    >
                      <div>
                        <div className="font-bold text-white text-sm">
                          {u.companyName || u.displayName || 'Unnamed Company'}
                        </div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                        {u.kybDocuments && u.kybDocuments.length > 0 && (
                          <div className="text-[11px] text-cyan-400 font-bold mt-1">
                            {t('KYB Documents Attached')}: {u.kybDocuments.length}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSellerApproval(u.id, 'approve')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                        >
                          ✓ {t('Approve')}
                        </button>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSellerApproval(u.id, 'set_tier', e.target.value);
                            }
                          }}
                          className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                        >
                          <option value="">{t('Assign Tier...')}</option>
                          <option value="listed">🥉 Listed</option>
                          <option value="verified">🥈 Verified</option>
                          <option value="certified">🥇 Certified</option>
                          <option value="elite">💎 Elite</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSellerApproval(u.id, 'reject')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs cursor-pointer"
                        >
                          {t('Reject')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Product Approvals */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-base font-black text-white">
                      {t('Pending Product Listings')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('Review supplier-submitted wholesale products')}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-black">
                  {approvals.pendingProducts?.length || 0}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                {!approvals.pendingProducts || approvals.pendingProducts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {t('All products are reviewed and up to date.')}
                  </div>
                ) : (
                  approvals.pendingProducts.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-800/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">{p.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleProductApproval(p.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                        >
                          {t('Approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProductApproval(p.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs cursor-pointer"
                        >
                          {t('Reject')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full User & Company Directory */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">
                  {t('User & Company Directory')} ({filteredUsers.length})
                </h2>
                <p className="text-xs text-slate-400">
                  {t('Manage user accounts, company profiles, roles, and verification status')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t('Search name, email, company...')}
                    className="bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none w-52 sm:w-64"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="all">{t('All Roles')}</option>
                  <option value="admin">Admin</option>
                  <option value="seller">Seller</option>
                  <option value="both">Both (Buyer & Seller)</option>
                  <option value="buyer">Buyer</option>
                </select>
                <button
                  type="button"
                  onClick={() => setAddingUser(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Add Account')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">{t('User / Email')}</th>
                    <th className="px-5 py-3.5">{t('Company')}</th>
                    <th className="px-5 py-3.5">{t('Role')}</th>
                    <th className="px-5 py-3.5">{t('Verification')}</th>
                    <th className="px-5 py-3.5 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">#{u.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{u.displayName || '—'}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.companyName ? (
                          <Link
                            to={`/company/${u.id}`}
                            className="font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{u.companyName}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : u.role === 'seller' || u.role === 'both'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            u.verificationStatus === 'verified'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : u.verificationStatus === 'pending'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.verificationStatus || 'unverified'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {t('Edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title={t('Delete User')}
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ==================== WORKSPACE 4: B2B OUTREACH & KORTBUTIKER ==================== */}
      {activeWorkspace === 'outreach-crm' && (
        <motion.div
          key="outreach-crm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Sub-navigation pill bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => setCrmSubTab('kort-butiker')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                crmSubTab === 'kort-butiker'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              🇸🇪 {t('Svenska Kortbutiker CRM')}
            </button>
            <button
              type="button"
              onClick={() => setCrmSubTab('leads')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                crmSubTab === 'leads'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              🌍 {t('International Lead Outreach')} ({leads.length})
            </button>
            <button
              type="button"
              onClick={() => setCrmSubTab('affiliates')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                crmSubTab === 'affiliates'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              🤝 {t('Affiliate & Partner Pipeline')} ({affiliates.length})
            </button>
            <button
              type="button"
              onClick={() => setCrmSubTab('broadcast')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                crmSubTab === 'broadcast'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              📣 {t('Marketing Journal & Broadcasts')}
            </button>
          </div>

          {crmSubTab === 'kort-butiker' && <AdminKortButikerTab />}

          {crmSubTab === 'leads' && (
            <AdminLeadsTab
              leads={leads}
              user={user}
              fetchAdminData={fetchAdminData}
              setPreviewingHtml={setPreviewingHtml}
            />
          )}

          {crmSubTab === 'affiliates' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-base font-black text-white mb-4">
                  {t('Add High-Priority Partner / Supplier Lead')}
                </h3>
                <form
                  onSubmit={handleAddAffiliate}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Company Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={affiliateForm.companyName}
                      onChange={(e) =>
                        setAffiliateForm({ ...affiliateForm, companyName: e.target.value })
                      }
                      placeholder="Acme TCG Distribution"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Contact Email')}
                    </label>
                    <input
                      type="email"
                      required
                      value={affiliateForm.contactEmail}
                      onChange={(e) =>
                        setAffiliateForm({ ...affiliateForm, contactEmail: e.target.value })
                      }
                      placeholder="sales@acme.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Website')}
                    </label>
                    <input
                      type="text"
                      value={affiliateForm.website}
                      onChange={(e) =>
                        setAffiliateForm({ ...affiliateForm, website: e.target.value })
                      }
                      placeholder="https://acme.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
                  >
                    + {t('Add Partner Lead')}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                    <tr>
                      <th className="px-5 py-3.5">{t('Company')}</th>
                      <th className="px-5 py-3.5">{t('Email')}</th>
                      <th className="px-5 py-3.5">{t('Website')}</th>
                      <th className="px-5 py-3.5">{t('Pipeline Status')}</th>
                      <th className="px-5 py-3.5">{t('Added')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {affiliates.map((aff: any) => (
                      <tr key={aff.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-bold text-white">{aff.companyName}</td>
                        <td className="px-5 py-3.5 text-slate-300">{aff.contactEmail}</td>
                        <td className="px-5 py-3.5 text-cyan-400">
                          {aff.website ? (
                            <a href={aff.website} target="_blank" rel="noreferrer" className="hover:underline">
                              {aff.website}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={aff.status}
                            onChange={(e) => handleUpdateAffiliateStatus(aff.id, e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-white"
                          >
                            <option value="Lead">Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Negotiating">Negotiating</option>
                            <option value="Onboarded">Onboarded</option>
                            <option value="Declined">Declined</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                          {new Date(aff.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {affiliates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs">
                          {t('No partner leads tracked yet.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {crmSubTab === 'broadcast' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-base font-black text-white mb-4">
                  {t('Record Marketing Broadcast / Internal Admin Note')}
                </h3>
                <form onSubmit={handleSendMarketing} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Title / Campaign Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={marketingForm.campaignName}
                      onChange={(e) =>
                        setMarketingForm({ ...marketingForm, campaignName: e.target.value })
                      }
                      placeholder="e.g. Q4 Nordic Store Outreach"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Segment')}
                    </label>
                    <select
                      required
                      value={marketingForm.targetSegment}
                      onChange={(e) =>
                        setMarketingForm({ ...marketingForm, targetSegment: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    >
                      <option value="">{t('Select Segment...')}</option>
                      <option value="All Buyers">All Buyers</option>
                      <option value="Verified Distributors">Verified Distributors</option>
                      <option value="Swedish Card Shops">Swedish Card Shops</option>
                      <option value="Internal Note / Journal">Internal Note / Journal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Content / Notes')}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={marketingForm.messageContent}
                      onChange={(e) =>
                        setMarketingForm({ ...marketingForm, messageContent: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white outline-none"
                      placeholder={t('Write campaign message or operational note...')}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    {t('Save Entry')}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 font-black text-white text-base">
                  {t('Activity Log')}
                </div>
                <div className="divide-y divide-slate-800/70 max-h-[420px] overflow-y-auto">
                  {marketingLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      {t('No entries logged yet.')}
                    </div>
                  ) : (
                    marketingLogs.map((log: any) => (
                      <div key={log.id} className="p-4 space-y-1 hover:bg-slate-800/40">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{log.campaignName}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.dateSent).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-cyan-400 font-bold">
                          {log.targetSegment} · {log.recipientCount || 0} recipients
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">{log.messageContent}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ==================== WORKSPACE 5: CATEGORIES & FEEDBACK ==================== */}
      {activeWorkspace === 'categories-feedback' && (
        <motion.div
          key="categories-feedback"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <CategoryManagerSection adminHeaders={getHeaders} />

          {/* User Feedback & Bug Reports */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {t('User Feedback & Bug Reports')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('Submitted via the footer feedback widget across B2C and B2B')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                {feedback.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <tr>
                    <th className="px-5 py-3.5">{t('Date')}</th>
                    <th className="px-5 py-3.5">{t('Reporter')}</th>
                    <th className="px-5 py-3.5">{t('Type')}</th>
                    <th className="px-5 py-3.5">{t('Message')}</th>
                    <th className="px-5 py-3.5">{t('Status')}</th>
                    <th className="px-5 py-3.5 text-right">{t('Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-400 text-xs">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-slate-200">
                        {f.user
                          ? `${f.user.companyName || 'User'} (${f.user.email})`
                          : t('Anonymous')}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-cyan-400">{f.type}</td>
                      <td className="px-5 py-3.5 max-w-md text-slate-300">{f.message}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            f.status === 'Resolved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {f.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(f.id, 'Resolved')}
                            className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
                          >
                            {t('Mark Resolved')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(f.id, 'Pending')}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            {t('Reopen')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {feedback.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs">
                        {t('No feedback or bug reports submitted.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ==================== EMAIL HTML PREVIEW MODAL ==================== */}
      {previewingHtml && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-700 w-full h-full max-w-6xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-white text-base">{t('Email Template Preview')}</h3>
                <p className="text-xs text-slate-400">
                  {t('Previewing rendered HTML outreach template')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingHtml(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-950">
              <iframe
                srcDoc={previewingHtml}
                className="w-full h-full border-none"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE USER MODAL ==================== */}
      {addingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base">{t('Create New User Account')}</h3>
              <button
                type="button"
                onClick={() => setAddingUser(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  {t('Email')}
                </label>
                <input
                  required
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  {t('Password')}
                </label>
                <input
                  required
                  type="text"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  {t('Company Name')}
                </label>
                <input
                  required
                  type="text"
                  value={newUserForm.companyName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  {t('Role')}
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                >
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="both">Both</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                {t('Create Account')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT USER MODAL ==================== */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base">
                {t('Edit Account')}: {editingUser.displayName || editingUser.email}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleUpdateUser}
              className="p-6 space-y-4 overflow-y-auto max-h-[80vh]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {t('Email')}
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {t('Display Name')}
                  </label>
                  <input
                    type="text"
                    value={editingUser.displayName || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, displayName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{t('Role')}</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="both">Both</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {t('Verification Status')}
                  </label>
                  <select
                    value={editingUser.verificationStatus || 'pending'}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, verificationStatus: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  {t('Company Details')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Company Name')}
                    </label>
                    <input
                      type="text"
                      value={editingUser.companyName || ''}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, companyName: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Country')}
                    </label>
                    <input
                      type="text"
                      value={editingUser.country || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, country: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {t('Website')}
                    </label>
                    <input
                      type="text"
                      value={editingUser.website || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, website: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black"
                >
                  {t('Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT PRODUCT MODAL ==================== */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-white text-base">{t('Edit Listing')}</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {t('Title')}
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {t('Category')}
                </label>
                <select
                  value={editingProduct.categoryId || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      categoryId: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="">{t('No Category')}</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {t('Origin Facility Type')}
                </label>
                <select
                  value={editingProduct.originType || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, originType: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  {ORIGIN_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <ImageUploader
                images={editingProduct.images || []}
                onChange={(imgs) => setEditingProduct({ ...editingProduct, images: imgs })}
              />
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black"
                >
                  {t('Save Listing')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
