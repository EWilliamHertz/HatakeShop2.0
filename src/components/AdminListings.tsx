import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit, CheckSquare, Square, Check, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AdminListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch('/api-v2/admin/products');
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
      const res = await fetch('/api-v2/admin/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds, updates })
      });
      if (!res.ok) throw new Error('Failed to update products');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      setBulkCategory("");
    }
  });

  const filteredProducts = products.filter((p: any) => 
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.seller?.companyName?.toLowerCase().includes(search.toLowerCase())
  );

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
    if (bulkCategory) updates.categoryId = bulkCategory === 'null' ? null : parseInt(bulkCategory);
    
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
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-cyan-900/20 border-b border-cyan-800 p-3 flex items-center justify-between px-5">
          <span className="text-sm font-semibold text-cyan-400">{selectedIds.length} listings selected</span>
          <div className="flex items-center gap-3">
            <select 
              value={bulkCategory} 
              onChange={e => setBulkCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Assign Category --</option>
              <option value="null">No Category</option>
              {categoriesData.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={handleBulkUpdate}
              disabled={!bulkCategory || bulkUpdateMutation.isPending}
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
            {filteredProducts.map((p: any) => (
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
                      <div className="font-semibold text-slate-200 line-clamp-1">{p.title}</div>
                      <div className="text-xs text-slate-500">{p.originType} • MOQ: {p.moq}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-300 text-sm">{p.seller?.companyName || 'Unknown'}</div>
                  <div className="text-xs text-slate-500">{p.seller?.email}</div>
                </td>
                <td className="p-4 text-sm text-slate-300">
                  {p.categoryId ? categoriesData.find((c: any) => c.id === p.categoryId)?.name || 'Unknown' : <span className="text-slate-500 italic">None</span>}
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
