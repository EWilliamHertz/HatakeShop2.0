import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit, CheckSquare, Square, Check, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext.tsx';
import { PRODUCT_LANGUAGES, SEALED_TYPES, languageLabel, sealedTypeLabel } from '../lib/productTaxonomy.ts';

export function AdminListings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategoryIds, setBulkCategoryIds] = useState<number[]>([]);
  const [bulkSponsored, setBulkSponsored] = useState<string>('');
  const [bulkLanguage, setBulkLanguage] = useState<string>('');
  const [bulkSealedType, setBulkSealedType] = useState<string>('');
  const [bulkProductType, setBulkProductType] = useState<string>('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [filterSealedType, setFilterSealedType] = useState<string>('');
  const [filterProductType, setFilterProductType] = useState<string>('');
  const [filterSponsored, setFilterSponsored] = useState<string>('');
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
    mutationFn: async (payload: { productIds: string[], updates: any }) => {
      let token; try { token = await user?.getIdToken(); } catch(e) {}
      const res = await fetch('/api-v2/admin/products/bulk', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update products');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      setBulkCategoryIds([]);
      setBulkSponsored('');
      setBulkLanguage('');
      setBulkSealedType('');
    }
  });

  const filteredProducts = (Array.isArray(products) ? products : []).filter((p: any) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || p.seller?.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === '' || p.categoryId?.toString() === filterCategory || (Array.isArray(p.categoryIds) && p.categoryIds.includes(parseInt(filterCategory)));
    const matchesStatus = filterStatus === '' || p.approvalStatus === filterStatus;
    const matchesLanguage = filterLanguage === '' || (filterLanguage === '__unset' ? !p.language : p.language === filterLanguage);
    const matchesSealedType = filterSealedType === '' || (filterSealedType === '__unset' ? !p.sealedType : p.sealedType === filterSealedType);
    const matchesProductType = filterProductType === '' || p.productType === filterProductType;
    const matchesSponsored = filterSponsored === '' || (filterSponsored === 'true' ? p.isSponsored : !p.isSponsored);
    return matchesSearch && matchesCategory && matchesStatus && matchesLanguage && matchesSealedType && matchesProductType && matchesSponsored;
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
    if (bulkLanguage !== '') updates.language = bulkLanguage === '__clear' ? null : bulkLanguage;
    if (bulkSealedType !== '') updates.sealedType = bulkSealedType === '__clear' ? null : bulkSealedType;
    if (bulkProductType !== '') updates.productType = bulkProductType === '__clear' ? null : bulkProductType;
    
    if (Object.keys(updates).length > 0) {
      bulkUpdateMutation.mutate({ productIds: selectedIds, updates });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading listings...</div>;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl">
      <div className="sticky top-[64px] sm:top-[80px] z-20 flex flex-col shadow-xl">
        <div className="bg-slate-900 p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-t-2xl">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">All Listings ({products.length})</h2>
          <p className="text-sm text-slate-400 mt-1">Manage and bulk edit products from all sellers.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
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
              value={filterProductType} 
              onChange={e => setFilterProductType(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">All Main Types</option>
              <option value="sealed">Sealed</option>
              <option value="graded">Graded</option>
              <option value="accessories">Accessories</option>
            </select>
          <select 
              value={filterSponsored} 
              onChange={e => setFilterSponsored(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">All Placements</option>
              <option value="true">Sponsored Only</option>
              <option value="false">Regular Only</option>
            </select>
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
            value={filterLanguage} 
            onChange={e => setFilterLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Languages</option>
            {PRODUCT_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            <option value="__unset">⚠ No language set</option>
          </select>

          <select 
            value={filterSealedType} 
            onChange={e => setFilterSealedType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Product Types</option>
            {SEALED_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            <option value="__unset">⚠ No type set</option>
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
        <div className="bg-cyan-900/20 border-b border-cyan-800 p-3 flex flex-wrap items-center justify-between gap-3 px-5">
          <span className="text-sm font-semibold text-cyan-400">{selectedIds.length} listings selected</span>
          <div className="flex items-center gap-3 flex-wrap">
            
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
            <select 
              value={bulkLanguage} 
              onChange={e => setBulkLanguage(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Set Language --</option>
              {PRODUCT_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              <option value="__clear">Clear language</option>
            </select>
            <select 
              value={bulkSealedType} 
              onChange={e => setBulkSealedType(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Set Product Type --</option>
              {SEALED_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              <option value="__clear">Clear type</option>
            </select>
            <select 
              value={bulkProductType} 
              onChange={e => setBulkProductType(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Set Main Type --</option>
              <option value="sealed">Sealed</option>
              <option value="graded">Graded</option>
              <option value="accessories">Accessories</option>
              <option value="__clear">Clear type</option>
            </select>
            <button 
              onClick={handleBulkUpdate}
              disabled={(bulkCategoryIds.length === 0 && bulkSponsored === '' && bulkLanguage === '' && bulkSealedType === '' && bulkProductType === '') || bulkUpdateMutation.isPending}
              className="btn-primary"
            >
              {bulkUpdateMutation.isPending ? 'Updating...' : 'Apply Bulk Edit'}
                        </button>
          </div>
        </div>
      )}
      </div>

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
              <th className="p-4">Language</th>
              <th className="p-4">Type</th>
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

                <td className="p-4 text-sm">
                  {p.language ? <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-xs">{languageLabel(p.language)}</span> : <span className="text-amber-400/80 text-xs italic">Not set</span>}
                </td>
                <td className="p-4 text-sm">
                  {p.sealedType ? <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{sealedTypeLabel(p.sealedType)}</span> : <span className="text-amber-400/80 text-xs italic">Not set</span>}
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
