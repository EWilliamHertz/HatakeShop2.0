import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext.tsx';
import {
  Save,
  Image as ImageIcon,
  Search,
  Edit2,
  X,
  Eye,
  Package,
  CheckSquare,
  Square,
  ExternalLink,
  Plus,
  Trash2,
  Link as LinkIcon,
  Layers,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductModal } from './ProductModal.tsx';
import { SafeImage } from './SafeImage.tsx';
import { getB2cPriceSEK } from '../pages/SwedenShop.tsx';
import { useCurrency } from './CurrencyProvider.tsx';
import { PRODUCT_LANGUAGES, SEALED_TYPES } from '../lib/productTaxonomy.ts';

interface NewProductFormState {
  sverigeTitle: string;
  sverigePrice: string;
  brand: string;
  categoryType: string;
  language: string;
  stockQuantity: string;
  isPreorder: boolean;
  preorderLabel: string;
  description: string;
  images: string[];
  gradingCompany: string;
  grade: string;
  certNumber: string;
  alsoShowOnB2b: boolean;
  unitCostEur: string;
  moq: string;
}

const INITIAL_NEW_PRODUCT: NewProductFormState = {
  sverigeTitle: '',
  sverigePrice: '',
  brand: 'Pokémon',
  categoryType: 'booster_box',
  language: 'en',
  stockQuantity: '15',
  isPreorder: false,
  preorderLabel: '',
  description: '',
  images: [],
  gradingCompany: 'PSA',
  grade: '10',
  certNumber: '',
  alsoShowOnB2b: false,
  unitCostEur: '',
  moq: '1',
};

export function AdminSverigeTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatSEK } = useCurrency();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any>(null);

  // Create New Product Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState<NewProductFormState>(INITIAL_NEW_PRODUCT);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [creating, setCreating] = useState(false);

  // Import from B2B Catalog Modal state
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSekPrices, setCatalogSekPrices] = useState<Record<number, string>>({});

  // Single-row edit states
  const [editTitle, setEditTitle] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('20');
  const [editCategoryType, setEditCategoryType] = useState('booster_box');
  const [editLanguage, setEditLanguage] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPreorder, setEditPreorder] = useState(false);
  const [editPreorderLabel, setEditPreorderLabel] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editImageUrlInput, setEditImageUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  // Batch edit states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchPriceSek, setBatchPriceSek] = useState('');
  const [batchStockQty, setBatchStockQty] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const getToken = async () => {
    const adminTok =
      sessionStorage.getItem('hatake_admin_token') ||
      localStorage.getItem('hatake_admin_token') ||
      '';
    if (adminTok) return adminTok;
    const tok = await user?.getIdToken();
    return tok || '';
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['sverige-admin-products'],
    queryFn: async () => {
      const res = await fetch('/api-v2/sverige-products');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: allCatalogProducts = [] } = useQuery({
    queryKey: ['admin-products-all-for-b2c-picker'],
    enabled: showCatalogPicker,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api-v2/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      sverigeTitle?: string;
      brand?: string;
      sverigePrice?: string;
      sverigeImages?: string[];
      stockQuantity?: number;
      sealedType?: string | null;
      productType?: string;
      language?: string | null;
      description?: string;
      isPreorder?: boolean;
      preorderLabel?: string;
      isSverigeB2c?: boolean;
    }) => {
      const token = await getToken();
      const res = await fetch(`/api-v2/admin/products/${data.id}/sverige`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-all-for-b2c-picker'] });
      toast.success(t('Produkt uppdaterad på hatake.shop'));
      setEditingId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || t('Kunde inte spara ändringar'));
    },
  });

  const deletePermanentMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const res = await fetch(`/api-v2/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(t('Produkten raderades permanent'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('Kunde inte radera produkten'));
    },
  });

  const uploadFiles = async (files: FileList | null): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    setUploading(true);
    try {
      const urls: string[] = [];
      const token = await getToken();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
        });
        const res = await fetch('/api-v2/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }
      if (urls.length > 0) toast.success(t('Bilder uppladdade'));
      return urls;
    } catch (err) {
      console.error(err);
      toast.error(t('Uppladdning misslyckades'));
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files);
    if (urls.length > 0) setEditImages((prev) => [...prev, ...urls]);
  };

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files);
    if (urls.length > 0) {
      setNewForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    }
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.sverigeTitle.trim()) {
      toast.error(t('Ange en produkttitel'));
      return;
    }
    if (!newForm.sverigePrice.trim() || parseFloat(newForm.sverigePrice) <= 0) {
      toast.error(t('Ange ett giltigt pris i SEK'));
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const isGraded = newForm.categoryType === 'graded';
      const finalImages = [...newForm.images];
      if (imageUrlInput.trim()) {
        finalImages.push(imageUrlInput.trim());
      }

      const res = await fetch('/api-v2/admin/sverige-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newForm.sverigeTitle.trim(),
          sverigeTitle: newForm.sverigeTitle.trim(),
          sverigePrice: newForm.sverigePrice.trim(),
          unitCost: newForm.unitCostEur.trim() || undefined,
          brand: newForm.brand.trim() || 'Hatake',
          description: newForm.description.trim(),
          stockQuantity: Math.max(0, parseInt(newForm.stockQuantity, 10) || 15),
          moq: Math.max(1, parseInt(newForm.moq, 10) || 1),
          productType: isGraded ? 'graded' : 'sealed',
          sealedType: isGraded ? null : newForm.categoryType,
          gradingCompany: isGraded ? newForm.gradingCompany : null,
          grade: isGraded ? newForm.grade : null,
          certNumber: isGraded ? newForm.certNumber : null,
          language: newForm.language || null,
          isPreorder: newForm.isPreorder,
          preorderLabel: newForm.isPreorder ? newForm.preorderLabel.trim() : null,
          images: finalImages,
          sverigeImages: finalImages,
          isSverigeB2c: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Kunde inte skapa produkten');
      }

      toast.success(`${t('Produkt tillagd på hatake.shop')}: ${newForm.sverigeTitle}`);
      setNewForm(INITIAL_NEW_PRODUCT);
      setImageUrlInput('');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err: any) {
      toast.error(err?.message || t('Kunde inte skapa produkten'));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditTitle(p.sverigeTitle || p.title || '');
    setEditBrand(p.brand || 'Pokémon');
    setEditPrice(String(p.sverigePrice || getB2cPriceSEK(p) || ''));
    setEditStock(String(typeof p.stockQuantity === 'number' ? p.stockQuantity : 20));
    setEditCategoryType(p.productType === 'graded' ? 'graded' : p.sealedType || 'booster_box');
    setEditLanguage(p.language || '');
    setEditDescription(p.description || '');
    setEditPreorder(Boolean(p.isPreorder));
    setEditPreorderLabel(p.preorderLabel || '');
    setEditImageUrlInput('');
    let imgs: string[] = [];
    try {
      imgs =
        Array.isArray(p.sverigeImages) && p.sverigeImages.length > 0
          ? p.sverigeImages
          : Array.isArray(p.images)
            ? p.images
            : JSON.parse(p.images || '[]');
    } catch {}
    setEditImages(imgs);
  };

  const saveEdit = (id: number) => {
    const isGraded = editCategoryType === 'graded';
    const nextImgs = [...editImages];
    if (editImageUrlInput.trim()) {
      nextImgs.push(editImageUrlInput.trim());
    }
    updateMutation.mutate({
      id,
      sverigeTitle: editTitle.trim(),
      brand: editBrand.trim() || 'Hatake',
      sverigePrice: editPrice.trim(),
      stockQuantity: Math.max(0, parseInt(editStock, 10) || 0),
      productType: isGraded ? 'graded' : 'sealed',
      sealedType: isGraded ? null : editCategoryType,
      language: editLanguage || null,
      description: editDescription.trim(),
      isPreorder: editPreorder,
      preorderLabel: editPreorder ? editPreorderLabel.trim() : '',
      sverigeImages: nextImgs,
    });
  };

  const removeProductFromB2c = (id: number) => {
    updateMutation.mutate({ id, isSverigeB2c: false });
  };

  const filtered = (Array.isArray(products) ? products : []).filter((p: any) =>
    `${p.sverigeTitle || ''} ${p.title || ''} ${p.brand || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p: any) => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBatchApply = async () => {
    if (selectedIds.length === 0) return;
    if (!batchPriceSek.trim() && !batchStockQty.trim()) {
      toast.error(t('Ange nytt SEK-pris eller lagersaldo för massuppdatering'));
      return;
    }
    setIsBatchSaving(true);
    try {
      const token = await getToken();
      for (const id of selectedIds) {
        const payload: any = {};
        if (batchPriceSek.trim()) payload.sverigePrice = batchPriceSek.trim();
        if (batchStockQty.trim()) payload.stockQuantity = Math.max(0, parseInt(batchStockQty, 10) || 0);
        await fetch(`/api-v2/admin/products/${id}/sverige`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${t('Uppdaterade')} ${selectedIds.length} ${t('produkter')}`);
      setSelectedIds([]);
      setBatchPriceSek('');
      setBatchStockQty('');
    } catch (e: any) {
      toast.error(e?.message || t('Massuppdatering misslyckades'));
    } finally {
      setIsBatchSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-slate-400 p-8 text-center">{t('Laddar produkter för hatake.shop...')}</div>;
  }

  const availableB2bToImport = (Array.isArray(allCatalogProducts) ? allCatalogProducts : [])
    .filter((p: any) => !p.isSverigeB2c)
    .filter((p: any) =>
      `${p.title || ''} ${p.brand || ''} ${p.seller?.companyName || ''}`
        .toLowerCase()
        .includes(catalogSearch.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-2xl">🇸🇪</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('Hatake.Shop (B2C) — Produkthantering')}
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-extrabold">
                {products.length} {t('produkter live')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t(
                'Lägg till nya produkter för hatake.shop (localhost:3000), sätt priser i SEK (inkl. moms), hantera lagersaldo och ladda upp produktbilder.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('Lägg till ny produkt')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCatalogPicker(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{t('Hämta från B2B-katalog')}</span>
            </button>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={t('Sök produkter...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm focus:border-cyan-500 outline-none text-slate-200"
              />
            </div>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors"
            >
              <span>hatake.shop</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Batch Edit Toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-cyan-950/40 border-b border-cyan-500/30 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-cyan-300">
              {selectedIds.length} {t('produkter markerade för massredigering')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="1"
                placeholder={t('Sätt SEK-pris (kr)')}
                value={batchPriceSek}
                onChange={(e) => setBatchPriceSek(e.target.value)}
                className="w-36 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                step="1"
                placeholder={t('Sätt lagersaldo (st)')}
                value={batchStockQty}
                onChange={(e) => setBatchStockQty(e.target.value)}
                className="w-36 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleBatchApply}
                disabled={isBatchSaving}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors disabled:opacity-50"
              >
                {isBatchSaving ? t('Sparar...') : t('Tillämpa på markerade')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {t('Avmarkera')}
              </button>
            </div>
          </div>
        )}

        {/* Table or Empty State */}
        {filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg sm:text-xl font-black text-white">
                {search
                  ? t('Inga produkter matchade din sökning')
                  : t('Inga produkter ligger ute på hatake.shop ännu')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {t(
                  'Klicka på "Lägg till ny produkt" för att skapa en ny vara med SEK-pris och bilder direkt för hatake.shop, eller importera befintliga produkter från B2B-katalogen.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('Lägg till första produkten på hatake.shop')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCatalogPicker(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{t('Välj från B2B-katalog')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <button type="button" onClick={toggleSelectAll} className="hover:text-cyan-400">
                      {selectedIds.length === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">{t('Produkt / Varumärke')}</th>
                  <th className="p-4">{t('Kategori & Språk')}</th>
                  <th className="p-4">{t('Pris (SEK)')}</th>
                  <th className="p-4">{t('Lager & Status')}</th>
                  <th className="p-4">{t('Bilder')}</th>
                  <th className="p-4 text-right">{t('Åtgärder')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((p: any) => {
                  const imgs =
                    Array.isArray(p.sverigeImages) && p.sverigeImages.length > 0
                      ? p.sverigeImages
                      : Array.isArray(p.images)
                        ? p.images
                        : [];
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center align-top">
                        <button
                          type="button"
                          onClick={() => toggleSelect(p.id)}
                          className="text-slate-400 hover:text-cyan-400"
                        >
                          {selectedIds.includes(p.id) ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {editingId === p.id ? (
                        <>
                          <td className="p-4 align-top space-y-2 min-w-[240px]">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Produkttitel')}
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Varumärke')}
                              </label>
                              <input
                                type="text"
                                value={editBrand}
                                onChange={(e) => setEditBrand(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Beskrivning')}
                              </label>
                              <textarea
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                          </td>
                          <td className="p-4 align-top space-y-2 min-w-[170px]">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Produkttyp')}
                              </label>
                              <select
                                value={editCategoryType}
                                onChange={(e) => setEditCategoryType(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                {SEALED_TYPES.map((st) => (
                                  <option key={st.value} value={st.value}>
                                    {st.label}
                                  </option>
                                ))}
                                <option value="graded">{t('Graderat Kort (Slab)')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Språk')}
                              </label>
                              <select
                                value={editLanguage}
                                onChange={(e) => setEditLanguage(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="">{t('Inget / Tillbehör')}</option>
                                {PRODUCT_LANGUAGES.map((l) => (
                                  <option key={l.value} value={l.value}>
                                    {l.flag} {l.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              {t('Pris i SEK (kr)')}
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold"
                            />
                          </td>
                          <td className="p-4 align-top space-y-2 min-w-[180px]">
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {t('Antal i lager (st)')}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white"
                              />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editPreorder}
                                onChange={(e) => setEditPreorder(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-cyan-500"
                              />
                              <span>{t('Förhandsbokning (Preorder)')}</span>
                            </label>
                            {editPreorder && (
                              <input
                                type="text"
                                value={editPreorderLabel}
                                onChange={(e) => setEditPreorderLabel(e.target.value)}
                                placeholder={t('T.ex. Lansering Q4 2026')}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            )}
                          </td>
                          <td className="p-4 align-top min-w-[200px]">
                            <div className="flex gap-2 flex-wrap mb-2">
                              {editImages.map((img, i) => (
                                <div
                                  key={i}
                                  className="relative w-11 h-11 rounded-lg border border-slate-600 overflow-hidden group"
                                >
                                  <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/65 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-rose-400"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1.5">
                              <label className="cursor-pointer text-xs inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>{uploading ? t('Laddar upp...') : t('Ladda upp bildfil')}</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleEditImageUpload}
                                  disabled={uploading}
                                />
                              </label>
                              <div className="flex gap-1">
                                <input
                                  type="url"
                                  value={editImageUrlInput}
                                  onChange={(e) => setEditImageUrlInput(e.target.value)}
                                  placeholder="https://..."
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editImageUrlInput.trim()) {
                                      setEditImages((prev) => [...prev, editImageUrlInput.trim()]);
                                      setEditImageUrlInput('');
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(p.id)}
                                className="inline-flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors"
                              >
                                <Save className="w-3.5 h-3.5" /> {t('Spara')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-slate-400 hover:text-white px-2.5 py-1.5 text-xs font-semibold"
                              >
                                {t('Cancel')}
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">
                            <div className="font-bold text-slate-100">{p.sverigeTitle || p.title}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span className="text-cyan-400 font-semibold">{p.brand || 'Hatake'}</span>
                              {p.description && (
                                <span className="text-slate-500 truncate max-w-[240px]">• {p.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-slate-300">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                                {p.productType === 'graded' ? 'Graded Slab' : p.sealedType || 'sealed'}
                              </span>
                              {p.language && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 uppercase font-bold">
                                  {p.language}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-extrabold text-emerald-400 tabular-nums">
                            {formatSEK(getB2cPriceSEK(p))}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {p.isPreorder ? (
                                <span className="inline-flex w-fit px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                                  {p.preorderLabel || t('Förhandsbokning')}
                                </span>
                              ) : (
                                <span className="inline-flex w-fit px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tabular-nums">
                                  {p.stockQuantity ?? 20} {t('st i lager')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1.5">
                              {imgs.slice(0, 3).map((img: string, i: number) => (
                                <div
                                  key={i}
                                  className="w-10 h-10 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 shrink-0"
                                >
                                  <SafeImage
                                    src={img}
                                    alt=""
                                    fallbackIcon={<Package className="w-4 h-4 text-slate-600" />}
                                    className="w-full h-full object-contain p-0.5"
                                  />
                                </div>
                              ))}
                              {imgs.length > 3 && (
                                <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0">
                                  +{imgs.length - 3}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(p)}
                                title={t('Förhandsgranska på hatake.shop')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="hidden sm:inline">{t('Förhandsgranska')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>{t('Redigera')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeProductFromB2c(p.id)}
                                title={t('Dölj från hatake.shop (behåll i databas)')}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePermanentMutation.mutate(p.id)}
                                title={t('Radera permanent')}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create New Product Modal (Framer Motion) */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-8"
            >
              <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {t('Lägg till ny produkt på hatake.shop')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('Produkten publiceras direkt i den svenska B2C-butiken (SEK inkl. moms)')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewProduct} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Produktnamn / Titel')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.sverigeTitle}
                      onChange={(e) => setNewForm({ ...newForm, sverigeTitle: e.target.value })}
                      placeholder={t('T.ex. Pokémon Surging Sparks Booster Box')}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Pris i SEK (kr)')} *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={newForm.sverigePrice}
                      onChange={(e) => setNewForm({ ...newForm, sverigePrice: e.target.value })}
                      placeholder="1490"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Varumärke / Spel')}
                    </label>
                    <input
                      type="text"
                      list="hatake-brands-list"
                      value={newForm.brand}
                      onChange={(e) => setNewForm({ ...newForm, brand: e.target.value })}
                      placeholder="Pokémon"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                    <datalist id="hatake-brands-list">
                      <option value="Pokémon" />
                      <option value="One Piece" />
                      <option value="Magic: The Gathering" />
                      <option value="Disney Lorcana" />
                      <option value="Yu-Gi-Oh!" />
                      <option value="Dragon Ball Super" />
                      <option value="Hatake" />
                      <option value="TopBestPKG" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Kategori / Produkttyp')}
                    </label>
                    <select
                      value={newForm.categoryType}
                      onChange={(e) => setNewForm({ ...newForm, categoryType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    >
                      {SEALED_TYPES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                      <option value="graded">{t('Graderat Kort (PSA / BGS / CGC)')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Språk / Utgåva')}
                    </label>
                    <select
                      value={newForm.language}
                      onChange={(e) => setNewForm({ ...newForm, language: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">{t('Inget / Tillbehör')}</option>
                      {PRODUCT_LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.flag} {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {newForm.categoryType === 'graded' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                        {t('Graderingsbolag')}
                      </label>
                      <select
                        value={newForm.gradingCompany}
                        onChange={(e) => setNewForm({ ...newForm, gradingCompany: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="PSA">PSA</option>
                        <option value="BGS">Beckett (BGS)</option>
                        <option value="CGC">CGC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                        {t('Betyg (Grade)')}
                      </label>
                      <input
                        type="text"
                        value={newForm.grade}
                        onChange={(e) => setNewForm({ ...newForm, grade: e.target.value })}
                        placeholder="10"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                        {t('Certifikatnummer')}
                      </label>
                      <input
                        type="text"
                        value={newForm.certNumber}
                        onChange={(e) => setNewForm({ ...newForm, certNumber: e.target.value })}
                        placeholder="Valfritt"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Antal i lager (st)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newForm.stockQuantity}
                      onChange={(e) => setNewForm({ ...newForm, stockQuantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-4 sm:pt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newForm.isPreorder}
                        onChange={(e) => setNewForm({ ...newForm, isPreorder: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500"
                      />
                      <span>{t('Förhandsbokning (Preorder)')}</span>
                    </label>
                    {newForm.isPreorder && (
                      <input
                        type="text"
                        value={newForm.preorderLabel}
                        onChange={(e) => setNewForm({ ...newForm, preorderLabel: e.target.value })}
                        placeholder={t('T.ex. Förhandsbokning · Release Q4')}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Produktbeskrivning')}
                  </label>
                  <textarea
                    rows={3}
                    value={newForm.description}
                    onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                    placeholder={t('Beskriv innehåll, skick, utgåva och leveransinformation...')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                {/* Product Images Section */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {t('Produktbilder')} ({newForm.images.length})
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{uploading ? t('Laddar upp...') : t('Ladda upp bild från enhet')}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleNewImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* Direct Image URL input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder={t('Eller klistra in bild-URL (https://...)')}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (imageUrlInput.trim()) {
                          setNewForm((prev) => ({
                            ...prev,
                            images: [...prev.images, imageUrlInput.trim()],
                          }));
                          setImageUrlInput('');
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-slate-700"
                    >
                      {t('Lägg till URL')}
                    </button>
                  </div>

                  {newForm.images.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {newForm.images.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-900 group"
                        >
                          <SafeImage src={url} alt="" className="w-full h-full object-contain p-1" />
                          <button
                            type="button"
                            onClick={() =>
                              setNewForm((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
                              }))
                            }
                            className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-rose-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating || uploading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{creating ? t('Publicerar...') : t('Publicera på hatake.shop')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import from Existing B2B Catalog Modal */}
      <AnimatePresence>
        {showCatalogPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCatalogPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
            >
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {t('Publicera produkt från B2B-katalogen på hatake.shop')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('Välj valfri produkt ur databasen, ange SEK-pris och aktivera för hatake.shop med 1 klick')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatalogPicker(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={t('Sök bland B2B-produkter (t.ex. Pokémon, One Piece, Binder, Acrylic)...')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-800 overflow-y-auto flex-1">
                {availableB2bToImport.slice(0, 60).map((item: any) => {
                  const imgs = Array.isArray(item.images) ? item.images : [];
                  const defaultSek = String(getB2cPriceSEK(item));
                  const priceVal = catalogSekPrices[item.id] ?? defaultSek;
                  return (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                          <SafeImage
                            src={imgs[0]}
                            alt={item.title}
                            fallbackIcon={<Package className="w-5 h-5 text-slate-600" />}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{item.title}</div>
                          <div className="text-xs text-slate-400">
                            {item.brand || item.seller?.companyName || 'Hatake'} • B2B: €{item.unitCost || 0}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <input
                            type="number"
                            value={priceVal}
                            onChange={(e) =>
                              setCatalogSekPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-20 bg-transparent text-xs font-bold text-emerald-400 outline-none text-right"
                          />
                          <span className="text-xs text-slate-500 font-bold">kr</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateMutation.mutate({
                              id: item.id,
                              isSverigeB2c: true,
                              sverigeTitle: item.sverigeTitle || item.title,
                              sverigePrice: priceVal,
                              stockQuantity: item.stockQuantity > 0 ? item.stockQuantity : 20,
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors"
                        >
                          + {t('Aktivera på hatake.shop')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Storefront Preview Modal */}
      {previewProduct && (
        <ProductModal
          product={previewProduct}
          hideMOQ={true}
          onClose={() => setPreviewProduct(null)}
          onAddToCart={() => {
            toast.info(t('Detta är en förhandsgranskning av köpknappen på hatake.shop'));
          }}
        />
      )}
    </div>
  );
}
