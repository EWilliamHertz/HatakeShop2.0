import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { 
  Store, Search, Plus, Upload, RefreshCw, Edit2, Trash2, 
  Globe, Mail, Phone, MapPin, ExternalLink, X, Save, Tag, Building2, ShoppingBag
} from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

export interface SwedishCardShop {
  id: number;
  name: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  cardTypes: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AdminKortButikerTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<SwedishCardShop | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Fysisk butik + Webshop',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    cardTypes: '',
    notes: '',
  });

  // Query card shops
  const { data: shops = [], isLoading, isFetching } = useQuery<SwedishCardShop[]>({
    queryKey: ['admin-kort-butiker'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api-v2/admin/kort-butiker', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Kunde inte hämta butiker');
      return res.json();
    }
  });

  // Add shop mutation
  const addMutation = useMutation({
    mutationFn: async (newShop: typeof formData) => {
      const token = await user?.getIdToken();
      const res = await fetch('/api-v2/admin/kort-butiker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newShop)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Misslyckades att lägga till butik');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kort-butiker'] });
      toast.success('Butiken har lagts till!');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fel vid tillägg av butik');
    }
  });

  // Update shop mutation
  const updateMutation = useMutation({
    mutationFn: async (shop: SwedishCardShop) => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/admin/kort-butiker/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(shop)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Misslyckades att uppdatera butik');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kort-butiker'] });
      toast.success('Butiksuppgifter uppdaterade!');
      setEditingShop(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fel vid uppdatering');
    }
  });

  // Delete shop mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/admin/kort-butiker/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Misslyckades att ta bort butik');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kort-butiker'] });
      toast.success('Butik raderad!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fel vid radering');
    }
  });

  // Sync from uploaded file on disk
  const syncFileMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api-v2/admin/kort-butiker/sync-file', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kunde inte synka från fil');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-kort-butiker'] });
      toast.success(`Synkade ${data.added} nya butiker från ${data.file}!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fel vid filsynkronisering');
    }
  });

  // Import custom CSV data
  const importCsvMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const token = await user?.getIdToken();
      const res = await fetch('/api-v2/admin/kort-butiker/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ csvData })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Import misslyckades');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-kort-butiker'] });
      toast.success(`Importerade ${data.added} butiker (${data.parsed} lästa från CSV)!`);
      setIsImportModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fel vid CSV-import');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Fysisk butik + Webshop',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      cardTypes: '',
      notes: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (shop: SwedishCardShop) => {
    setEditingShop(shop);
  };

  const handleDelete = (shop: SwedishCardShop) => {
    if (confirm(`Är du säker på att du vill ta bort "${shop.name}"?`)) {
      deleteMutation.mutate(shop.id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importCsvMutation.mutate(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter shops
  const filteredShops = shops.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch = 
      s.name?.toLowerCase().includes(term) ||
      s.city?.toLowerCase().includes(term) ||
      s.address?.toLowerCase().includes(term) ||
      s.cardTypes?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term);

    const matchesType = 
      typeFilter === 'ALL' ||
      (typeFilter === 'PHYSICAL_ONLY' && s.type?.toLowerCase() === 'fysisk butik') ||
      (typeFilter === 'WEBSHOP_ONLY' && s.type?.toLowerCase() === 'webshop') ||
      (typeFilter === 'BOTH' && (s.type?.toLowerCase().includes('fysisk') && s.type?.toLowerCase().includes('web')));

    return matchesSearch && matchesType;
  });

  // Stats calculation
  const totalShops = shops.length;
  const webshopCount = shops.filter(s => s.type?.toLowerCase().includes('web')).length;
  const physicalCount = shops.filter(s => s.type?.toLowerCase().includes('fysisk')).length;
  const uniqueCities = new Set(
    shops
      .map(s => s.city)
      .filter(Boolean)
      .flatMap(c => c.split(',').map(part => part.trim()))
      .filter(c => c.toLowerCase() !== 'online')
  ).size;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Kortbutiker Totalt</div>
            <div className="text-2xl font-black text-white">{totalShops}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Fysiska Butiker</div>
            <div className="text-2xl font-black text-indigo-300">{physicalCount}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Webbutiker</div>
            <div className="text-2xl font-black text-emerald-300">{webshopCount}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Orter i Sverige</div>
            <div className="text-2xl font-black text-amber-300">{uniqueCities}</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        {/* Header & Actions */}
        <div className="p-6 border-b border-slate-700 bg-slate-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              🇸🇪 Kortbutiker Sverige
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                kort_butiker_sverige
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Databas över svenska kort- och samlarbutiker. Hantera kontaktinfo, adress, korttyper samt lägg till butiker manuellt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => syncFileMutation.mutate()}
              disabled={syncFileMutation.isPending}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Läs in butiker från filen kort_butiker_sverige_komplett.csv i projektet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncFileMutation.isPending ? 'animate-spin' : ''}`} />
              Synka från fil
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Importera CSV
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 text-xs py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              + Lägg till butik manuellt
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Sök butik, stad, korttyp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0">Typ:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
            >
              <option value="ALL">Alla typer ({totalShops})</option>
              <option value="BOTH">Fysisk butik + Webshop</option>
              <option value="WEBSHOP_ONLY">Endast Webshop</option>
              <option value="PHYSICAL_ONLY">Endast Fysisk butik</option>
            </select>
            {isFetching && (
              <span className="text-xs text-cyan-400 animate-pulse ml-2">Uppdaterar...</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700/60 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Butiksnamn</th>
                <th className="p-3.5">Typ</th>
                <th className="p-3.5">Stad / Adress</th>
                <th className="p-3.5">Kontakt</th>
                <th className="p-3.5">Korttyper</th>
                <th className="p-3.5 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredShops.map((shop) => (
                <tr key={shop.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3.5 align-top">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      {shop.name}
                      {shop.website && shop.website !== 'N/A' && (
                        <a
                          href={shop.website.startsWith('http') ? shop.website : `https://${shop.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Besök hemsida"
                        >
                          <ExternalLink className="w-3.5 h-3.5 inline" />
                        </a>
                      )}
                    </div>
                    {shop.notes && (
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{shop.notes}</div>
                    )}
                  </td>

                  <td className="p-3.5 align-top">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      shop.type?.toLowerCase().includes('fysisk') && shop.type?.toLowerCase().includes('web')
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                        : shop.type?.toLowerCase().includes('web')
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    }`}>
                      {shop.type || 'Fysisk butik'}
                    </span>
                  </td>

                  <td className="p-3.5 align-top">
                    <div className="text-slate-200 font-medium">{shop.city || '—'}</div>
                    {shop.address && shop.address !== 'Online' && shop.address !== shop.city && (
                      <div className="text-slate-400 text-[11px] mt-0.5">{shop.address}</div>
                    )}
                  </td>

                  <td className="p-3.5 align-top space-y-1">
                    {shop.email && shop.email !== 'N/A' ? (
                      <a
                        href={`mailto:${shop.email}`}
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        {shop.email}
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Ingen e-post</span>
                    )}

                    {shop.phone && shop.phone !== 'N/A' && !shop.phone.includes('XX') && (
                      <a
                        href={`tel:${shop.phone}`}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono text-[11px]"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        {shop.phone}
                      </a>
                    )}
                  </td>

                  <td className="p-3.5 align-top">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {shop.cardTypes
                        ? shop.cardTypes.split(',').map((ct, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px]"
                            >
                              {ct.trim()}
                            </span>
                          ))
                        : <span className="text-slate-500 italic">—</span>}
                    </div>
                  </td>

                  <td className="p-3.5 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(shop)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Redigera"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(shop)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Ta bort"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredShops.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {search || typeFilter !== 'ALL'
                      ? 'Inga butiker matchar din sökning.'
                      : 'Inga butiker hittades. Klicka på "Synka från fil" för att ladda butiker från kort_butiker_sverige_komplett.csv eller lägg till manuellt!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MANUELLT TILLÄGG (Add Store) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-cyan-400" />
                Lägg till butik manuellt
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate(formData);
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Butiksnamn <span className="text-cyan-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="t.ex. Coolcard.se"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Typ</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Fysisk butik + Webshop">Fysisk butik + Webshop</option>
                    <option value="Webshop">Webshop</option>
                    <option value="Fysisk butik">Fysisk butik</option>
                    <option value="Webshop + Fysisk">Webshop + Fysisk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stad / Orter</label>
                  <input
                    type="text"
                    placeholder="t.ex. Stockholm, Göteborg"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adress</label>
                <input
                  type="text"
                  placeholder="Gatuadress eller 'Flera lokaler'"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="t.ex. +46 8 123 45"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-post</label>
                  <input
                    type="email"
                    placeholder="info@butik.se"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Webbplats</label>
                <input
                  type="text"
                  placeholder="https://www.butik.se"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Korttyper (kommaseparerat)
                </label>
                <input
                  type="text"
                  placeholder="t.ex. Magic, Pokemon, Lorcana, One Piece"
                  value={formData.cardTypes}
                  onChange={(e) => setFormData({ ...formData, cardTypes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Anteckningar / Info</label>
                <textarea
                  rows={2}
                  placeholder="Övrig information eller öppettider..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-700"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl px-4 py-2 text-xs transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {addMutation.isPending ? 'Sparar...' : 'Spara butik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDIGERA BUTIK (Edit Store) */}
      {editingShop && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                Redigera butik: {editingShop.name}
              </h3>
              <button
                onClick={() => setEditingShop(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editingShop);
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Butiksnamn <span className="text-cyan-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editingShop.name}
                  onChange={(e) => setEditingShop({ ...editingShop, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Typ</label>
                  <select
                    value={editingShop.type || 'Fysisk butik + Webshop'}
                    onChange={(e) => setEditingShop({ ...editingShop, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Fysisk butik + Webshop">Fysisk butik + Webshop</option>
                    <option value="Webshop">Webshop</option>
                    <option value="Fysisk butik">Fysisk butik</option>
                    <option value="Webshop + Fysisk">Webshop + Fysisk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stad / Orter</label>
                  <input
                    type="text"
                    value={editingShop.city || ''}
                    onChange={(e) => setEditingShop({ ...editingShop, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adress</label>
                <input
                  type="text"
                  value={editingShop.address || ''}
                  onChange={(e) => setEditingShop({ ...editingShop, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingShop.phone || ''}
                    onChange={(e) => setEditingShop({ ...editingShop, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-post</label>
                  <input
                    type="email"
                    value={editingShop.email || ''}
                    onChange={(e) => setEditingShop({ ...editingShop, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Webbplats</label>
                <input
                  type="text"
                  value={editingShop.website || ''}
                  onChange={(e) => setEditingShop({ ...editingShop, website: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Korttyper</label>
                <input
                  type="text"
                  value={editingShop.cardTypes || ''}
                  onChange={(e) => setEditingShop({ ...editingShop, cardTypes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Anteckningar</label>
                <textarea
                  rows={2}
                  value={editingShop.notes || ''}
                  onChange={(e) => setEditingShop({ ...editingShop, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingShop(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-700"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl px-4 py-2 text-xs transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTERA CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Importera kortbutiker från CSV
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                Välj en .csv-fil med svenska kortbutiker (t.ex. <code>kort_butiker_sverige_komplett.csv</code>).
                Filen bör innehålla kolumner som: <em>Butiks_Namn, Typ, Stad, Adress, Telefon, Email, Webbplats, Korttyper</em>.
              </p>

              <label className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-colors">
                <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Klicka för att välja CSV-fil</span>
                <span className="text-[10px] text-slate-500 mt-1">.csv filer stöds</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={importCsvMutation.isPending}
                />
              </label>

              {importCsvMutation.isPending && (
                <div className="text-center text-xs text-cyan-400 animate-pulse">
                  Importerar butiker till databasen...
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-700"
                >
                  Stäng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
