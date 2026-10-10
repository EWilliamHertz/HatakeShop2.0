import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { Save, Image as ImageIcon, CheckCircle, Search, Edit2, X } from 'lucide-react';
import { cloudinaryUpload } from '../lib/cloudinary.js';

export function AdminSverigeTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['sverige-admin-products'],
    queryFn: async () => {
      const res = await fetch('/api-v2/sverige-products');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; sverigeTitle?: string; sverigePrice?: string; sverigeImages?: string[]; isSverigeB2c?: boolean }) => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/admin/products/${data.id}/sverige`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }); // also refresh listings
      setEditingId(null);
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await cloudinaryUpload(files[i]);
        urls.push(url);
      }
      setEditImages([...editImages, ...urls]);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditTitle(p.sverigeTitle || p.title || '');
    setEditPrice(p.sverigePrice || p.unitCost || '');
    setEditImages(p.sverigeImages || p.images || []);
  };

  const saveEdit = (id: number) => {
    updateMutation.mutate({
      id,
      sverigeTitle: editTitle,
      sverigePrice: editPrice,
      sverigeImages: editImages
    });
  };

  const removeProduct = (id: number) => {
    if (confirm('Remove this product from the Swedish B2C Shop?')) {
      updateMutation.mutate({ id, isSverigeB2c: false });
    }
  };

  const filtered = products.filter((p: any) => 
    (p.sverigeTitle || p.title)?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-slate-400 p-8 text-center">Loading B2C Shop products...</div>;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-700 bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">🇸🇪 Svenska Shop Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage B2C-specific overrides (Title, Price, Images). Products here are toggled from the <strong>Listings</strong> tab.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search B2C products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700/50 uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Product / Title</th>
              <th className="p-4">B2B Cost</th>
              <th className="p-4">B2C Price (kr)</th>
              <th className="p-4">B2C Images</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtered.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/50">
                {editingId === p.id ? (
                  <>
                    <td className="p-4 align-top">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">B2C Title</label>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white" />
                        <div className="text-xs text-slate-500 mt-1">Original: {p.title}</div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-400">€{p.unitCost}</td>
                    <td className="p-4 align-top">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">B2C Price</label>
                        <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white max-w-[120px]" />
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex gap-2 flex-wrap mb-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative w-12 h-12 rounded border border-slate-600 overflow-hidden group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="cursor-pointer text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                        <ImageIcon className="w-3 h-3" />
                        {uploading ? 'Uploading...' : 'Add Images'}
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                          <Save className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{p.sverigeTitle || p.title}</div>
                      {p.sverigeTitle && <div className="text-xs text-slate-500 line-clamp-1">Original: {p.title}</div>}
                    </td>
                    <td className="p-4 text-slate-400">€{p.unitCost}</td>
                    <td className="p-4 font-medium text-emerald-400">
                      {p.sverigePrice ? `${p.sverigePrice} kr` : <span className="text-slate-500 italic">Not set</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {(p.sverigeImages || p.images || []).slice(0, 3).map((img: string, i: number) => (
                          <div key={i} className="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-900 shrink-0">
                            <img src={img} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {(p.sverigeImages || p.images || []).length > 3 && (
                          <div className="w-10 h-10 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0">
                            +{(p.sverigeImages || p.images || []).length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => startEdit(p)} className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                          <Edit2 className="w-4 h-4" /> Edit B2C Info
                        </button>
                        <button onClick={() => removeProduct(p.id)} className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm">
                          <X className="w-4 h-4" /> Remove from B2C
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  {search ? 'No products found matching your search.' : 'No products in the Swedish Shop. Go to the Listings tab to add some!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
