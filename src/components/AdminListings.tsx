import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit, CheckSquare, Square, Check, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext.tsx';

export function AdminListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategoryIds, setBulkCategoryIds] = useState<number[]>([]);
  const [bulkSponsored, setBulkSponsored] = useState<string>('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      let token; try { token = await user?.getIdToken(); } catch(e) {}
      const res = await fetch('/api-v2/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api-v2/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: any) => {
      let token; try { token = await user?.getIdToken(); } catch(e) {}
      const res = await fetch('/api-v2/admin/products/bulk', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ productIds: selectedIds, updates })
      });
      if (!res.ok) throw new Error('Failed to update products');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      setBulkCategoryIds([]);
      setBulkSponsored('');
    }
  });

  const filteredProducts = (Array.isArray(products) ? products : []).filter((p: any) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || p.seller?.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === '' || p.categoryId?.toString() === filterCategory || (Array.isArray(p.categoryIds) && p.categoryIds.includes(parseInt(filterCategory)));
    const matchesStatus = filterStatus === '' || p.approvalStatus === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a: any, b: any) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'price_asc') return (parseFloat(a.unitCost) || 0) - (parseFloat(b.unitCost) || 0);
    if (sortBy === 'price_desc') return (parseFloat(b.unitCost) || 0) - (parseFloat(a.unitCost) || 0);
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p: any) => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) return;
    const updates: any = {};
    if (bulkCategoryIds.length > 0) updates.categoryIds = bulkCategoryIds;
    if (bulkSponsored !== '') updates.isSponsored = bulkSponsored === 'true';
    
    if (Object.keys(updates).length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading listings...</div>;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="bg-slate-900 p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">All Listings ({products.length})</h2>
          <p className="text-sm text-slate-400 mt-1">Manage and bulk edit products from all sellers.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search products or sellers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 transition-all"
            />
          </div>
          
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Categories</option>
            {Array.isArray(categoriesData) && categoriesData.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-cyan-900/20 border-b border-cyan-800 p-3 flex items-center justify-between px-5">
          <span className="text-sm font-semibold text-cyan-400">{selectedIds.length} listings selected</span>
          <div className="flex items-center gap-3">
            
            <div className="flex flex-col relative group">
              <button type="button" onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none min-w-[200px] text-left flex justify-between items-center">
    <span>{bulkCategoryIds.length > 0 ? `${bulkCategoryIds.length} categories selected` : '-- Assign Categories --'}</span>
  </button>
  {isCategoryMenuOpen && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsCategoryMenuOpen(false)}></div>
      <div className="absolute top-full left-0 mt-1 w-[300px] max-h-[300px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-2">
  
                {Array.isArray(categoriesData) && categoriesData.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={bulkCategoryIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setBulkCategoryIds([...bulkCategoryIds, c.id]);
                        else setBulkCategoryIds(bulkCategoryIds.filter(id => id !== c.id));
                      }}
                      className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-200">{c.name}</span>
                  </label>
                ))}
                <button 
                  onClick={() => setBulkCategoryIds([])}
                  className="w-full text-left p-1.5 mt-1 text-xs text-slate-400 hover:text-slate-200 border-t border-slate-700"
                >
                  Clear Selection
                </button>
              </div>
            </>
          )}
        </div>

            <select 
              value={bulkSponsored} 
              onChange={e => setBulkSponsored(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Set Sponsored --</option>
              <option value="true">Mark as Sponsored</option>
              <option value="false">Remove Sponsored</option>
            </select>
            <button 
              onClick={handleBulkUpdate}
              disabled={(bulkCategoryIds.length === 0 && bulkSponsored === '') || bulkUpdateMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-4 py-1.5 rounded-lg text-sm font-bold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkUpdateMutation.isPending ? 'Updating...' : 'Apply Bulk Edit'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/50 text-xs uppercase tracking-wider font-semibold text-slate-400">
              <th className="p-4 w-12 text-center">
                <button onClick={toggleSelectAll} className="hover:text-cyan-400 transition-colors">
                  {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare className="w-5 h-5 text-cyan-500" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="p-4">Product</th>
              <th className="p-4">Seller</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {Array.isArray(filteredProducts) && filteredProducts.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group">
                <td className="p-4 text-center">
                  <button onClick={() => toggleSelect(p.id)} className="text-slate-500 hover:text-cyan-400 transition-colors">
                    {selectedIds.includes(p.id) ? <CheckSquare className="w-5 h-5 text-cyan-500" /> : <Square className="w-5 h-5" />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500"><Search className="w-4 h-4"/></div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 line-clamp-1">{p.title} {p.isSponsored && <span className="ml-2 bg-[#ffcc00] text-black px-1.5 py-0.5 rounded text-[10px] font-bold">SPONSORED</span>}</div>
                      <div className="text-xs text-slate-500">{p.originType} • MOQ: {p.moq}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-300 text-sm">{p.seller?.companyName || 'Unknown'}</div>
                  <div className="text-xs text-slate-500">{p.seller?.email}</div>
                </td>
                
                <td className="p-4 text-sm text-slate-300">
                  {Array.isArray(p.categoryIds) && p.categoryIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.categoryIds.map((cid: number) => {
                        const c = (Array.isArray(categoriesData) ? categoriesData : []).find((cat: any) => cat.id === cid);
                        return c ? <span key={cid} className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">{c.name}</span> : null;
                      })}
                    </div>
                  ) : p.categoryId ? (Array.isArray(categoriesData) ? categoriesData : []).find((c: any) => c.id === p.categoryId)?.name || 'Unknown' : <span className="text-slate-500 italic">None</span>}
                </td>

                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.approvalStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : p.approvalStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {p.approvalStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No products found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
