import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/AuthContext.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { useTranslation } from 'react-i18next';
import {
  PackageSearch, MapPin, Heart, Plus, Trash2, Sliders, Calendar,
  Clock, DollarSign, Layers, Plane, Ship, Flame, AlertCircle,
  CheckCircle2, Sparkles, ShoppingCart, ExternalLink, Edit3,
  ChevronRight, Filter, FileSpreadsheet, ArrowRight, X, ArrowUpDown,
  TrendingUp, Boxes, ShieldCheck, Info, RefreshCw, Send, Check
} from 'lucide-react';
import { ProductModal } from '../components/ProductModal.tsx';
import { toast } from 'sonner';

interface WishlistItem {
  id: number;
  userId: number;
  productId: number | null;
  period?: string;
  budgetGroup?: string;
  targetQuantity?: number;
  targetBudget?: string | number | null;
  urgency?: 'high' | 'standard' | 'low';
  categoryTag?: string;
  notes?: string;
  customTitle?: string;
  createdAt?: string;
  product?: any;
}

interface ProcurementBucket {
  id: string;
  name: string;
  cap: number;
  description?: string;
}

const DEFAULT_BUCKETS: ProcurementBucket[] = [
  { id: 'immediate', name: 'Immediate Restock (7-14 Days / Express)', cap: 2500, description: 'Rapid replenishment for depleted tournament staples and high-velocity singles via Air Express.' },
  { id: 'q1_consolidation', name: 'Quarterly Consolidation (30-45 Days / Ocean)', cap: 5000, description: 'Bulk palletized case orders and restock cycles maximizing margins via consolidated sea freight.' },
  { id: 'preorders', name: 'Pre-Order Drop Waves', cap: 3000, description: 'Upcoming expansion releases, collector booster cases, and Japanese/Chinese street-date allocations.' },
  { id: 'oem_runs', name: 'Factory OEM Runs & Store Supplies', cap: 4000, description: 'Custom-printed matte sleeves, toploaders, branded deck boxes, and acrylic display cases.' }
];

const PRESET_CATEGORIES = [
  'Chinese Pokémon',
  'English Magic: The Gathering',
  'OEM Matte Sleeves & Supplies',
  'Japanese TCG & One Piece',
  'Acrylic Cases & Toploaders',
  'Graded Slabs & High-End'
];

export function Wishlist() {
  const { user, dbUser } = useAuth();
  const { formatPrice, currency } = useCurrency();
  const { addItem, setCartOpen } = useCart();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [isCapsModalOpen, setIsCapsModalOpen] = useState(false);
  const [showInfographic, setShowInfographic] = useState(true);

  // Form states for adding custom line item
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Chinese Pokémon');
  const [newPeriod, setNewPeriod] = useState('immediate');
  const [newQty, setNewQty] = useState(10);
  const [newBudget, setNewBudget] = useState('');
  const [newUrgency, setNewUrgency] = useState<'high' | 'standard' | 'low'>('standard');
  const [newNotes, setNewNotes] = useState('');

  // Form state for bucket caps
  const [editableCaps, setEditableCaps] = useState<Record<string, number>>({});

  // 1. Fetch Wishlist Items
  const { data: rawItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['wishlists', user?.uid || 'guest'],
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // 2. Fetch Procurement Settings
  const { data: procurementSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['wishlist-settings', user?.uid || 'guest'],
    queryFn: async () => {
      if (!user) return { buckets: DEFAULT_BUCKETS };
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return { buckets: DEFAULT_BUCKETS };
      const data = await res.json();
      return data?.buckets ? data : { buckets: DEFAULT_BUCKETS };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const buckets: ProcurementBucket[] = useMemo(() => {
    return procurementSettings?.buckets && procurementSettings.buckets.length > 0
      ? procurementSettings.buckets
      : DEFAULT_BUCKETS;
  }, [procurementSettings]);

  // Sync caps state when settings load
  React.useEffect(() => {
    if (buckets) {
      const map: Record<string, number> = {};
      buckets.forEach(b => { map[b.id] = b.cap; });
      setEditableCaps(map);
    }
  }, [buckets]);

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<WishlistItem> }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api-v2/wishlists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['wishlists', user?.uid || 'guest'], (prev: WishlistItem[] | undefined) => {
        if (!Array.isArray(prev)) return [updated];
        return prev.map(item => item.id === updated.id ? { ...item, ...updated, product: item.product } : item);
      });
    },
    onError: () => {
      toast.error('Failed to update planning item');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api-v2/wishlists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete item');
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['wishlists', user?.uid || 'guest'], (prev: WishlistItem[] | undefined) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(item => item.id !== deletedId);
      });
      toast.success('Removed item from procurement plan');
    },
    onError: () => {
      toast.error('Failed to remove item');
    }
  });

  const addCustomItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to add custom item');
      return res.json();
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(['wishlists', user?.uid || 'guest'], (prev: WishlistItem[] | undefined) => {
        return [newItem, ...(Array.isArray(prev) ? prev : [])];
      });
      toast.success('Added planned line item to procurement plan');
      setIsAddCustomOpen(false);
      setNewTitle('');
      setNewBudget('');
      setNewNotes('');
    },
    onError: () => {
      toast.error('Failed to add custom planned item');
    }
  });

  const updateCapsMutation = useMutation({
    mutationFn: async (updatedBuckets: ProcurementBucket[]) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ buckets: updatedBuckets })
      });
      if (!res.ok) throw new Error('Failed to update budget caps');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-settings'] });
      toast.success('Budget caps saved successfully');
      setIsCapsModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to update budget caps');
    }
  });

  // Dynamic user & facility naming
  const shopkeeperName = dbUser?.displayName || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Shopkeeper';
  const facilityName = dbUser?.companyName || dbUser?.storeName || (dbUser?.role === 'admin' ? 'Hatake Global HQ' : 'Retail Facility');

  // Enrich items with default budget/quantity fallback
  const items: WishlistItem[] = useMemo(() => {
    return rawItems.map((item: any) => {
      const unitCost = Number(item.targetBudget || item.product?.unitPrice || item.product?.unitCost || 0);
      return {
        ...item,
        period: item.period || 'immediate',
        targetQuantity: item.targetQuantity || 1,
        targetBudget: item.targetBudget !== null && item.targetBudget !== undefined ? item.targetBudget : (item.product?.unitPrice || 0),
        urgency: item.urgency || 'standard',
        categoryTag: item.categoryTag || item.product?.category || (item.product?.title?.toLowerCase().includes('pokémon') || item.product?.title?.toLowerCase().includes('pokemon') ? 'Chinese Pokémon' : item.product?.title?.toLowerCase().includes('magic') ? 'English Magic' : 'OEM Matte Sleeves & Supplies')
      };
    });
  }, [rawItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeTab !== 'all' && item.period !== activeTab) return false;
      if (categoryFilter !== 'all' && item.categoryTag !== categoryFilter) return false;
      if (urgencyFilter !== 'all' && item.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [items, activeTab, categoryFilter, urgencyFilter]);

  // Spending calculations
  const bucketTotals = useMemo(() => {
    const totals: Record<string, { spend: number; units: number; count: number }> = {};
    buckets.forEach(b => { totals[b.id] = { spend: 0, units: 0, count: 0 }; });

    items.forEach(item => {
      const period = item.period || 'immediate';
      if (!totals[period]) totals[period] = { spend: 0, units: 0, count: 0 };
      const qty = Number(item.targetQuantity) || 1;
      const price = Number(item.targetBudget || item.product?.unitPrice || 0);
      totals[period].spend += qty * price;
      totals[period].units += qty;
      totals[period].count += 1;
    });

    return totals;
  }, [items, buckets]);

  const totalPlannedSpend = useMemo(() => {
    return Object.values(bucketTotals).reduce((sum, b) => sum + b.spend, 0);
  }, [bucketTotals]);

  const totalCaps = useMemo(() => {
    return buckets.reduce((sum, b) => sum + (Number(b.cap) || 0), 0);
  }, [buckets]);

  const totalUnits = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.targetQuantity) || 1), 0);
  }, [items]);

  // Bulk Add Bucket to Cart
  const handleAddBucketToCart = (bucketId: string) => {
    const bucketItems = items.filter(i => i.period === bucketId && i.product);
    if (bucketItems.length === 0) {
      toast.info('No live marketplace products found in this bucket to add to cart.');
      return;
    }
    let addedCount = 0;
    bucketItems.forEach(item => {
      if (item.product) {
        addItem({
          productId: item.product.id,
          title: item.product.title,
          unitPrice: Number(item.targetBudget || item.product.unitPrice || 0),
          quantity: Number(item.targetQuantity || 1),
          imageUrl: item.product.images?.[0] || '',
          sellerId: item.product.sellerId,
          sellerName: item.product.seller?.companyName || item.product.seller?.displayName || 'Hatake Partner'
        } as any);
        addedCount++;
      }
    });
    setCartOpen(true);
    toast.success(`Added ${addedCount} products from this bucket to your sample cart!`);
  };

  // Export line sheet as CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.info('Your wishlist is empty. Add items first before exporting.');
      return;
    }
    const headers = ['Line Item ID', 'Title', 'Product ID', 'Category Tag', 'Period / Bucket', 'Target Quantity', 'Target Unit Budget ($)', 'Subtotal ($)', 'Urgency', 'Notes'];
    const rows = items.map(i => {
      const title = (i.customTitle || i.product?.title || 'Custom Line Item').replace(/,/g, ' ');
      const subtotal = (Number(i.targetQuantity || 1) * Number(i.targetBudget || i.product?.unitPrice || 0)).toFixed(2);
      return [
        i.id,
        `"${title}"`,
        i.productId || 'Custom (Unlisted)',
        `"${i.categoryTag || 'General'}"`,
        `"${i.period || 'immediate'}"`,
        i.targetQuantity || 1,
        Number(i.targetBudget || i.product?.unitPrice || 0).toFixed(2),
        subtotal,
        i.urgency || 'standard',
        `"${(i.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hatake_Procurement_Plan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Procurement line-sheet exported successfully!');
  };

  // Handle Save Caps Modal
  const handleSaveCaps = () => {
    const updated = buckets.map(b => ({
      ...b,
      cap: Number(editableCaps[b.id] ?? b.cap)
    }));
    updateCapsMutation.mutate(updated);
  };

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">B2B Procurement & Wishlist Hub</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6">
          Log in to manage and budget your inventory pipeline, organize product allocations across custom periods, and track supply-chain lead times.
        </p>
      </div>
    );
  }

  const overallPercent = totalCaps > 0 ? Math.min(Math.round((totalPlannedSpend / totalCaps) * 100), 100) : 0;
  const isOverallOverBudget = totalPlannedSpend > totalCaps && totalCaps > 0;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* 1. Dynamic Greeting & Infographical Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>B2B Procurement Chamber & Budget Planner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome, Shopkeeper <span className="text-indigo-400">{shopkeeperName}</span> of <span className="text-emerald-400">{facilityName}</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Your centralized inventory budgeting and replenishment terminal. Forecast upcoming demand, stage purchasing allocations for high-velocity lines—such as <strong className="text-white">Chinese Pokémon</strong> booster cases, staple <strong className="text-white">English Magic: The Gathering</strong> releases, or factory-direct <strong className="text-white">OEM matte sleeves & acrylic cases</strong>—and map each batch to the exact period and delivery speed your facility demands.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => setIsAddCustomOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Planned Line Item</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCapsModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium text-xs transition-colors"
                title="Configure Spending Caps"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Budget Caps</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium text-xs transition-colors"
                title="Export Line Sheet to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Infographical 3-Pillar Cards (Collapsible) */}
        {showInfographic && (
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                How To Master Your Procurement Runway
              </span>
              <button
                onClick={() => setShowInfographic(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Dismiss Guide
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pillar 1 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2.5 text-indigo-300 font-semibold text-sm">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span>1. Categorize Product Lines</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Budget across categories such as <strong className="text-slate-200">Chinese Pokémon</strong> (Nine Colors Gathering, collector sets), <strong className="text-slate-200">English Magic</strong> (Modern/Commander staples), and <strong className="text-slate-200">OEM Matte Sleeves</strong> or custom acrylic supplies. Tag and isolate line items by specialization.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 border border-slate-700">Chinese Pokémon</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-amber-300 border border-slate-700">English Magic</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-300 border border-slate-700">OEM Sleeves</span>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2.5 text-emerald-300 font-semibold text-sm">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span>2. Match Velocity & Lead Times</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Place items into time buckets based on urgency: <strong className="text-slate-200">Immediate Restock</strong> via Air Express (7–14 days), <strong className="text-slate-200">Quarterly Consolidation</strong> via Sea Freight (30–45 days) to maximize margin, or <strong className="text-slate-200">Pre-Order Drops</strong> for upcoming street-date waves.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-300 border border-slate-700">✈️ 7–14d Express</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-blue-300 border border-slate-700">🚢 30–45d Ocean</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-purple-300 border border-slate-700">⚡ Pre-Orders</span>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2.5 text-amber-300 font-semibold text-sm">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span>3. Guard Working Capital Caps</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Assign capital spending caps per period. Keep your facility's cashflow disciplined with live progress meters that monitor planned quantity against negotiated target budgets and wholesale pricing before placing bulk orders.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-1.5 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">Live Tracking</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Executive Capital & Budget Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Planned Capital</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{formatPrice(totalPlannedSpend)}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across {items.length} planned line items
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Cap Usage</span>
            <div className={`p-2 rounded-lg ${isOverallOverBudget ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{overallPercent}%</span>
            <span className="text-xs text-slate-400">of {formatPrice(totalCaps)} cap</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isOverallOverBudget ? 'bg-rose-500' : overallPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Units</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{totalUnits}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Total physical inventory forecasted
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Horizons</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{buckets.length} Buckets</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-400 cursor-pointer hover:underline" onClick={() => setIsCapsModalOpen(true)}>
            <Sliders className="w-3 h-3" />
            <span>Manage allocation caps</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Views Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        {/* Period Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'}`}
          >
            All Horizons ({items.length})
          </button>
          {buckets.map(b => {
            const bSpend = bucketTotals[b.id]?.spend || 0;
            const isSelected = activeTab === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setActiveTab(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'}`}
              >
                <span>{b.id === 'immediate' ? '✈️ Express' : b.id === 'q1_consolidation' ? '🚢 Ocean' : b.id === 'preorders' ? '⚡ Drops' : '🏭 OEM'}</span>
                <span>{b.name.split('(')[0]}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
                  {formatPrice(bSpend)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary filters & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            {PRESET_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Urgency Levels</option>
            <option value="high">🔴 High Urgency</option>
            <option value="standard">🟡 Standard Restock</option>
            <option value="low">🟢 Strategic Buy</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === 'board' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Line Sheet
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Empty State vs Board vs Table */}
      {itemsLoading ? (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm">Loading procurement runway and budget items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <PackageSearch className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Your Procurement Runway is Empty</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Start staging your store's inventory by browsing the marketplace and clicking the heart icon on any product, or create a custom planned line item.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => setIsAddCustomOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Planned Line Item</span>
            </button>
            <a
              href="/marketplace"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Browse Marketplace</span>
            </a>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE / LINE SHEET VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Item Details</th>
                  <th className="py-3.5 px-3">Category Tag</th>
                  <th className="py-3.5 px-3">Target Period</th>
                  <th className="py-3.5 px-3">Target Qty</th>
                  <th className="py-3.5 px-3">Unit Budget</th>
                  <th className="py-3.5 px-3">Subtotal</th>
                  <th className="py-3.5 px-3">Urgency</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredItems.map(item => {
                  const title = item.customTitle || item.product?.title || 'Untitled Line Item';
                  const img = item.product?.images?.[0];
                  const unitBudget = Number(item.targetBudget || item.product?.unitPrice || 0);
                  const subtotal = (Number(item.targetQuantity || 1) * unitBudget);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={title} className="w-full h-full object-cover" />
                            ) : (
                              <Boxes className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-bold text-white truncate hover:text-indigo-400 cursor-pointer" onClick={() => item.product && setSelectedProduct(item.product)}>
                              {title}
                            </div>
                            {item.notes ? (
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                📝 {item.notes}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.productId ? `Marketplace SKU #${item.productId}` : 'Custom Procurement Item'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.categoryTag || 'Chinese Pokémon'}
                          onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { categoryTag: e.target.value } })}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
                        >
                          {PRESET_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.period || 'immediate'}
                          onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { period: e.target.value } })}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
                        >
                          {buckets.map(b => (
                            <option key={b.id} value={b.id}>{b.name.split('(')[0]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: Math.max(1, (item.targetQuantity || 1) - 1) } })}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm active:scale-95 transition-all"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.targetQuantity || 1}
                            onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: Math.max(1, parseInt(e.target.value) || 1) } })}
                            className="w-12 sm:w-14 bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-center text-white text-xs font-bold"
                          />
                          <button
                            onClick={() => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: (item.targetQuantity || 1) + 1 } })}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm active:scale-95 transition-all"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.targetBudget ?? ''}
                            onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { targetBudget: e.target.value } })}
                            placeholder="Unit cost"
                            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-xs font-semibold"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-emerald-400">
                        {formatPrice(subtotal)}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.urgency || 'standard'}
                          onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { urgency: e.target.value as any } })}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none border ${item.urgency === 'high' ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : item.urgency === 'low' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}
                        >
                          <option value="high">🔴 High Urgency</option>
                          <option value="standard">🟡 Standard</option>
                          <option value="low">🟢 Strategic</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.product && (
                            <button
                              onClick={() => {
                                addItem({
                                  productId: item.product.id,
                                  title: item.product.title,
                                  unitPrice: Number(item.targetBudget || item.product.unitPrice || 0),
                                  quantity: Number(item.targetQuantity || 1),
                                  imageUrl: item.product.images?.[0] || '',
                                  sellerId: item.product.sellerId,
                                  sellerName: item.product.seller?.companyName || item.product.seller?.displayName || 'Hatake Partner'
                                } as any);
                                toast.success(`Added ${item.product.title} to cart!`);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                              title="Add to Sample Cart"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN / BUCKETS BOARD VIEW */
        <div className="space-y-8">
          {buckets.filter(b => activeTab === 'all' || activeTab === b.id).map(bucket => {
            const bucketItems = filteredItems.filter(i => (i.period || 'immediate') === bucket.id);
            const bStats = bucketTotals[bucket.id] || { spend: 0, units: 0, count: 0 };
            const bCap = Number(bucket.cap) || 0;
            const bPercent = bCap > 0 ? Math.round((bStats.spend / bCap) * 100) : 0;
            const isOver = bStats.spend > bCap && bCap > 0;

            return (
              <div key={bucket.id} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                {/* Bucket Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {bucket.id === 'immediate' ? <Plane className="w-5 h-5" /> : bucket.id === 'q1_consolidation' ? <Ship className="w-5 h-5" /> : bucket.id === 'preorders' ? <Flame className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>{bucket.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                            {bucketItems.length} SKUs
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xl">
                          {bucket.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Spend vs Cap Tracker */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="text-base font-extrabold text-white">{formatPrice(bStats.spend)}</span>
                        <span className="text-xs text-slate-400">/ {formatPrice(bCap)}</span>
                      </div>
                      <div className="text-[11px] font-semibold mt-0.5 text-slate-400 flex items-center justify-end gap-1">
                        <span className={isOver ? 'text-rose-400 font-bold' : bPercent > 80 ? 'text-amber-400' : 'text-emerald-400'}>
                          {bPercent}% allocated
                        </span>
                        {isOver && <AlertCircle className="w-3 h-3 text-rose-400" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddBucketToCart(bucket.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                        title="Add all listed products in this bucket to sample cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Add Bucket to Cart</span>
                      </button>
                      <button
                        onClick={() => {
                          setNewPeriod(bucket.id);
                          setIsAddCustomOpen(true);
                        }}
                        className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                        title="Add planned line item to this bucket"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bucket Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : bPercent > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-indigo-500'}`}
                    style={{ width: `${Math.min(bPercent, 100)}%` }}
                  />
                </div>

                {/* Items Grid for this Bucket */}
                {bucketItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No products placed in this horizon yet. Move items here using the period selector or add a custom line item.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                    {bucketItems.map(item => {
                      const title = item.customTitle || item.product?.title || 'Planned Product';
                      const img = item.product?.images?.[0];
                      const unitBudget = Number(item.targetBudget || item.product?.unitPrice || 0);
                      const subtotal = (Number(item.targetQuantity || 1) * unitBudget);

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-all rounded-2xl p-4 flex flex-col justify-between group shadow-sm hover:shadow-md relative"
                        >
                          {/* Top Row: Thumbnail + Category Tag + Remove */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-[160px]">
                                {item.categoryTag || 'General TCG'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.urgency === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : item.urgency === 'low' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                  {item.urgency === 'high' ? 'High' : item.urgency === 'low' ? 'Strategic' : 'Standard'}
                                </span>
                                <button
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                  title="Remove item"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="flex gap-3 items-center mb-3">
                              <div
                                onClick={() => item.product && setSelectedProduct(item.product)}
                                className={`w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center ${item.product ? 'cursor-pointer' : ''}`}
                              >
                                {img ? (
                                  <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                  <Boxes className="w-6 h-6 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4
                                  onClick={() => item.product && setSelectedProduct(item.product)}
                                  className={`text-sm font-bold text-white line-clamp-2 leading-tight ${item.product ? 'cursor-pointer hover:text-indigo-400' : ''}`}
                                >
                                  {title}
                                </h4>
                                {item.notes && (
                                  <p className="text-[11px] text-slate-400 truncate mt-1">
                                    📝 {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Controls & Pricing */}
                          <div className="space-y-3 pt-3 border-t border-slate-700/60 text-xs">
                            {/* Quantity & Unit Budget */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Qty</label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: Math.max(1, (item.targetQuantity || 1) - 1) } })}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-sm active:scale-95 transition-all"
                                    aria-label="Decrease quantity"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.targetQuantity || 1}
                                    onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: Math.max(1, parseInt(e.target.value) || 1) } })}
                                    className="w-12 sm:w-14 bg-slate-900 border border-slate-700 rounded-lg px-1 text-center text-white text-xs font-bold py-1"
                                  />
                                  <button
                                    onClick={() => updateItemMutation.mutate({ id: item.id, updates: { targetQuantity: (item.targetQuantity || 1) + 1 } })}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-sm active:scale-95 transition-all"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Unit Budget</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.targetBudget ?? ''}
                                  onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { targetBudget: e.target.value } })}
                                  placeholder="0.00"
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-semibold focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Subtotal & Move Bucket */}
                            <div className="flex items-center justify-between pt-1">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal</span>
                                <span className="text-sm font-extrabold text-emerald-400">{formatPrice(subtotal)}</span>
                              </div>

                              <div className="text-right">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Move To Horizon</label>
                                <select
                                  value={item.period || 'immediate'}
                                  onChange={(e) => updateItemMutation.mutate({ id: item.id, updates: { period: e.target.value } })}
                                  className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[11px] font-medium focus:outline-none"
                                >
                                  {buckets.map(b => (
                                    <option key={b.id} value={b.id}>
                                      {b.name.split('(')[0]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Quick Add To Cart if Product exists */}
                            {item.product && (
                              <button
                                onClick={() => {
                                  addItem({
                                    productId: item.product.id,
                                    title: item.product.title,
                                    unitPrice: Number(item.targetBudget || item.product.unitPrice || 0),
                                    quantity: Number(item.targetQuantity || 1),
                                    imageUrl: item.product.images?.[0] || '',
                                    sellerId: item.product.sellerId,
                                    sellerName: item.product.seller?.companyName || item.product.seller?.displayName || 'Hatake Partner'
                                  } as any);
                                  toast.success(`Added ${item.product.title} to sample cart`);
                                }}
                                className="w-full py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Add to Cart ({item.targetQuantity || 1} units)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Add Custom Planned Line Item */}
      {isAddCustomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddCustomOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Plus className="w-3.5 h-3.5" />
                <span>Custom Procurement Item</span>
              </div>
              <h3 className="text-xl font-bold text-white">Add Planned Line Item</h3>
              <p className="text-xs text-slate-400">
                Budget for upcoming sets, unlisted expansions, or custom store supply batches.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) {
                  toast.error('Please enter a product title or description');
                  return;
                }
                addCustomItemMutation.mutate({
                  customTitle: newTitle.trim(),
                  categoryTag: newCategory,
                  period: newPeriod,
                  targetQuantity: Number(newQty) || 1,
                  targetBudget: newBudget ? Number(newBudget) : null,
                  urgency: newUrgency,
                  notes: newNotes.trim() || null,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">Item Title / Description *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Chinese Pokémon Nine Colors Gathering Slim Box Case"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Category Specialization</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    {PRESET_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other Category</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Fulfillment Horizon / Period</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    {buckets.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Target Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Target Unit Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Urgency Priority</label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="high">🔴 High Urgency</option>
                    <option value="standard">🟡 Standard</option>
                    <option value="low">🟢 Strategic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Procurement Notes / Supplier Specs</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Case-fresh shrink wrap only; need delivered before prerelease weekend"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCustomOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCustomItemMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {addCustomItemMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Planned Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Configure Spending Caps */}
      {isCapsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCapsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sliders className="w-3.5 h-3.5" />
                <span>Working Capital Management</span>
              </div>
              <h3 className="text-xl font-bold text-white">Configure Period Budget Caps</h3>
              <p className="text-xs text-slate-400">
                Adjust the working capital limits allocated to each delivery horizon.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {buckets.map(b => (
                <div key={b.id} className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{b.name}</span>
                    <span className="text-[10px] text-slate-400">
                      Currently: {formatPrice(bucketTotals[b.id]?.spend || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">$ / €</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={editableCaps[b.id] ?? b.cap}
                      onChange={(e) => setEditableCaps(prev => ({ ...prev, [b.id]: Number(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCapsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCaps}
                disabled={updateCapsMutation.isPending}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                {updateCapsMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Budget Caps</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Product Modal for Detailed View */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}