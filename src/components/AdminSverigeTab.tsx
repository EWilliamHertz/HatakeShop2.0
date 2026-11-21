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
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductModal } from './ProductModal.tsx';
import { SafeImage } from './SafeImage.tsx';
import { getB2cPriceSEK } from '../pages/SwedenShop.tsx';
import { useCurrency } from './CurrencyProvider.tsx';
import {
  PRODUCT_LANGUAGES,
  SEALED_TYPES,
  MERCHANDISE_FORMATS,
  TCG_GAMES,
  ProductDomain,
  inferProductDomain,
  inferTcgGame,
  tcgGameLabel,
  sealedTypeLabel,
} from '../lib/productTaxonomy.ts';

interface ProductFormState {
  id?: number;
  productDomain: ProductDomain;
  tcgGame: string;
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
  unitCostEur: string;
  moq: string;
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  productDomain: 'tcg',
  tcgGame: 'pokemon',
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
  unitCostEur: '',
  moq: '1',
};

const TCG_ONLY_FORMATS = SEALED_TYPES.filter((s) => s.group !== 'Merchandise');

export function AdminSverigeTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatSEK } = useCurrency();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [previewProduct, setPreviewProduct] = useState<any>(null);

  // Create & Edit Modal state (both share clean scrollable modal UX)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(INITIAL_PRODUCT_FORM);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Import from B2B Catalog Modal state
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSekPrices, setCatalogSekPrices] = useState<Record<number, string>>({});

  // Batch edit states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchPriceSek, setBatchPriceSek] = useState('');
  const [batchStockQty, setBatchStockQty] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const getToken = async () => {
    const adminTok = sessionStorage.getItem('hatake_admin_token') || '';
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
        headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      productDomain?: ProductDomain;
      tcgGame?: string | null;
      sverigeTitle?: string;
      brand?: string;
      sverigePrice?: string;
      sverigeImages?: string[];
      stockQuantity?: number;
      sealedType?: string | null;
      productType?: string;
      gradingCompany?: string | null;
      grade?: string | null;
      certNumber?: string | null;
      language?: string | null;
      description?: string;
      isPreorder?: boolean;
      preorderLabel?: string;
      isSverigeB2c?: boolean;
    }) => {
      const token = await getToken();
      const res = await fetch(`/api-v2/admin/products/${data.id}/sverige`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Admin-Token': token,
        },
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
      setModalMode(null);
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
        headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Admin-Token': token,
          },
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

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files);
    if (urls.length > 0) {
      setFormState((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    }
  };

  const openCreateModal = () => {
    setFormState(INITIAL_PRODUCT_FORM);
    setImageUrlInput('');
    setModalMode('create');
  };

  const openEditModal = (p: any) => {
    const domain = inferProductDomain(p);
    const game = inferTcgGame(p);
    let imgs: string[] = [];
    try {
      imgs =
        Array.isArray(p.sverigeImages) && p.sverigeImages.length > 0
          ? p.sverigeImages
          : Array.isArray(p.images)
            ? p.images
            : JSON.parse(p.images || '[]');
    } catch {}

    setFormState({
      id: p.id,
      productDomain: domain,
      tcgGame: game,
      sverigeTitle: p.sverigeTitle || p.title || '',
      sverigePrice: String(p.sverigePrice || getB2cPriceSEK(p) || ''),
      brand: p.brand || (domain === 'merchandise' ? 'Hatake' : 'Pokémon'),
      categoryType:
        p.productType === 'graded'
          ? 'graded'
          : p.sealedType || (domain === 'merchandise' ? 'accessory' : 'booster_box'),
      language: p.language || '',
      stockQuantity: String(typeof p.stockQuantity === 'number' ? p.stockQuantity : 20),
      isPreorder: Boolean(p.isPreorder),
      preorderLabel: p.preorderLabel || '',
      description: p.description || '',
      images: imgs,
      gradingCompany: p.gradingCompany || 'PSA',
      grade: p.grade || '10',
      certNumber: p.certNumber || '',
      unitCostEur: String(p.unitCost || ''),
      moq: String(p.moq || '1'),
    });
    setImageUrlInput('');
    setModalMode('edit');
  };

  const handleDomainSwitch = (nextDomain: ProductDomain) => {
    setFormState((prev) => {
      const nextFormat =
        nextDomain === 'merchandise'
          ? MERCHANDISE_FORMATS.some((m) => m.value === prev.categoryType)
            ? prev.categoryType
            : 'binder'
          : TCG_ONLY_FORMATS.some((tOpt) => tOpt.value === prev.categoryType) ||
              prev.categoryType === 'graded'
            ? prev.categoryType
            : 'booster_box';
      const nextLang = nextDomain === 'merchandise' ? '' : prev.language || 'en';
      const nextBrand =
        nextDomain === 'merchandise' && prev.brand === 'Pokémon'
          ? 'Hatake'
          : nextDomain === 'tcg' && prev.brand === 'Hatake'
            ? 'Pokémon'
            : prev.brand;
      return {
        ...prev,
        productDomain: nextDomain,
        categoryType: nextFormat,
        language: nextLang,
        brand: nextBrand,
      };
    });
  };

  const handleGameChange = (nextGame: string) => {
    const gameMeta = TCG_GAMES.find((g) => g.value === nextGame);
    setFormState((prev) => ({
      ...prev,
      tcgGame: nextGame,
      brand:
        prev.productDomain === 'tcg' && gameMeta && nextGame !== 'other'
          ? gameMeta.short === 'Pokémon'
            ? 'Pokémon'
            : gameMeta.label
          : prev.brand,
    }));
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.sverigeTitle.trim()) {
      toast.error(t('Ange en produkttitel'));
      return;
    }
    if (!formState.sverigePrice.trim() || parseFloat(formState.sverigePrice) <= 0) {
      toast.error(t('Ange ett giltigt pris i SEK'));
      return;
    }

    const isGraded = formState.categoryType === 'graded';
    const finalImages = [...formState.images];
    if (imageUrlInput.trim()) {
      finalImages.push(imageUrlInput.trim());
    }

    if (modalMode === 'edit' && formState.id) {
      updateMutation.mutate({
        id: formState.id,
        productDomain: formState.productDomain,
        tcgGame: formState.tcgGame || null,
        sverigeTitle: formState.sverigeTitle.trim(),
        brand: formState.brand.trim() || 'Hatake',
        sverigePrice: formState.sverigePrice.trim(),
        stockQuantity: Math.max(0, parseInt(formState.stockQuantity, 10) || 0),
        productType: isGraded ? 'graded' : 'sealed',
        sealedType: isGraded ? null : formState.categoryType,
        gradingCompany: isGraded ? formState.gradingCompany : null,
        grade: isGraded ? formState.grade : null,
        certNumber: isGraded ? formState.certNumber : null,
        language: formState.language || null,
        description: formState.description.trim(),
        isPreorder: formState.isPreorder,
        preorderLabel: formState.isPreorder ? formState.preorderLabel.trim() : '',
        sverigeImages: finalImages,
      });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch('/api-v2/admin/sverige-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Admin-Token': token,
        },
        body: JSON.stringify({
          title: formState.sverigeTitle.trim(),
          sverigeTitle: formState.sverigeTitle.trim(),
          sverigePrice: formState.sverigePrice.trim(),
          unitCost: formState.unitCostEur.trim() || undefined,
          brand: formState.brand.trim() || 'Hatake',
          description: formState.description.trim(),
          stockQuantity: Math.max(0, parseInt(formState.stockQuantity, 10) || 15),
          moq: Math.max(1, parseInt(formState.moq, 10) || 1),
          productDomain: formState.productDomain,
          tcgGame: formState.tcgGame || null,
          productType: isGraded ? 'graded' : 'sealed',
          sealedType: isGraded ? null : formState.categoryType,
          gradingCompany: isGraded ? formState.gradingCompany : null,
          grade: isGraded ? formState.grade : null,
          certNumber: isGraded ? formState.certNumber : null,
          language: formState.language || null,
          isPreorder: formState.isPreorder,
          preorderLabel: formState.isPreorder ? formState.preorderLabel.trim() : null,
          images: finalImages,
          sverigeImages: finalImages,
          isSverigeB2c: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t('Kunde inte skapa produkten'));
      }

      toast.success(`${t('Produkt tillagd på hatake.shop')}: ${formState.sverigeTitle}`);
      setFormState(INITIAL_PRODUCT_FORM);
      setImageUrlInput('');
      setModalMode(null);
      queryClient.invalidateQueries({ queryKey: ['sverige-admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err: any) {
      toast.error(err?.message || t('Kunde inte skapa produkten'));
    } finally {
      setSaving(false);
    }
  };

  const removeProductFromB2c = (id: number) => {
    updateMutation.mutate({ id, isSverigeB2c: false });
  };

  const filtered = (Array.isArray(products) ? products : []).filter((p: any) =>
    `${p.sverigeTitle || ''} ${p.title || ''} ${p.brand || ''} ${p.tcgGame || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Admin-Token': token,
          },
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
                'Lägg till och hantera produkter för hatake.shop, sätt priser i SEK (inkl. moms), välj TCG eller Merchandise och ladda upp produktbilder.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={openCreateModal}
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
                onClick={openCreateModal}
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
                  <th className="p-4">{t('Typ & TCG-Spel')}</th>
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
                  const domain = inferProductDomain(p);
                  const gameCode = inferTcgGame(p);
                  const gameTitle = tcgGameLabel(gameCode);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center align-middle">
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
                          <span
                            className={`px-2 py-0.5 rounded-md border font-bold uppercase ${
                              domain === 'merchandise'
                                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            {domain === 'merchandise' ? t('Merchandise') : 'TCG'}
                          </span>
                          {gameTitle && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-semibold">
                              {gameTitle}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                            {p.productType === 'graded'
                              ? `${p.gradingCompany || 'PSA'} ${p.grade || '10'}`
                              : t(sealedTypeLabel(p.sealedType || 'booster_box'))}
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline">{t('Förhandsgranska')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{t('Redigera')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProductFromB2c(p.id)}
                            title={t('Dölj från hatake.shop (behåll i databas)')}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePermanentMutation.mutate(p.id)}
                            title={t('Radera permanent')}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Scrollable Modal */}
      <AnimatePresence>
        {modalMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={() => setModalMode(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
            >
              {/* Fixed Modal Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    {modalMode === 'edit' ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {modalMode === 'edit'
                        ? t('Redigera produkt på hatake.shop')
                        : t('Lägg till ny produkt på hatake.shop')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('Välj om produkten är TCG eller Merchandise samt vilket TCG-spel den tillhör')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  aria-label={t('Close')}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form
                id="b2c-product-form"
                onSubmit={handleSubmitModal}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5 custom-scrollbar"
              >
                {/* Step 1: TCG vs Merchandise + TCG Game Picker */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400">
                      {t('Klassificering (TCG eller Merchandise)')} *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleDomainSwitch('tcg')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer ${
                          formState.productDomain === 'tcg'
                            ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>TCG ({t('Kortspel & Slabs')})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDomainSwitch('merchandise')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer ${
                          formState.productDomain === 'merchandise'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{t('Merchandise & Tillbehör')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Select TCG Game */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {t('TCG-spel / Serie')}{' '}
                        {formState.productDomain === 'tcg' ? '*' : `(${t('Optional')})`}
                      </label>
                      <select
                        required={formState.productDomain === 'tcg'}
                        value={formState.tcgGame}
                        onChange={(e) => handleGameChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                      >
                        {TCG_GAMES.map((g) => (
                          <option key={g.value} value={g.value}>
                            {t(g.label)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {formState.productDomain === 'merchandise'
                          ? t('Typ av Merchandise')
                          : t('TCG-Format / Produkttyp')}
                      </label>
                      <select
                        value={formState.categoryType}
                        onChange={(e) => setFormState({ ...formState, categoryType: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                      >
                        {formState.productDomain === 'merchandise' ? (
                          MERCHANDISE_FORMATS.map((mf) => (
                            <option key={mf.value} value={mf.value}>
                              {t(mf.label)}
                            </option>
                          ))
                        ) : (
                          <>
                            {TCG_ONLY_FORMATS.map((st) => (
                              <option key={st.value} value={st.value}>
                                {t(st.label)}
                              </option>
                            ))}
                            <option value="graded">{t('Graderat Kort (PSA / BGS / CGC)')}</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Title & Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Produktnamn / Titel')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.sverigeTitle}
                      onChange={(e) => setFormState({ ...formState, sverigeTitle: e.target.value })}
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
                      value={formState.sverigePrice}
                      onChange={(e) => setFormState({ ...formState, sverigePrice: e.target.value })}
                      placeholder="1490"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-400 outline-none"
                    />
                  </div>
                </div>

                {/* Brand & Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Varumärke / Tillverkare')}
                    </label>
                    <input
                      type="text"
                      list="hatake-brands-list"
                      value={formState.brand}
                      onChange={(e) => setFormState({ ...formState, brand: e.target.value })}
                      placeholder="Pokémon"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                    <datalist id="hatake-brands-list">
                      <option value="Pokémon" />
                      <option value="Magic: The Gathering" />
                      <option value="Yu-Gi-Oh!" />
                      <option value="Disney Lorcana" />
                      <option value="Hatake" />
                      <option value="GlimmerFall" />
                      <option value="TopBestPKG" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Språk / Utgåva')}
                    </label>
                    <select
                      value={formState.language}
                      onChange={(e) => setFormState({ ...formState, language: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">{t('Inget / Merchandise')}</option>
                      {PRODUCT_LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.flag} {t(l.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formState.categoryType === 'graded' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                        {t('Graderingsbolag')}
                      </label>
                      <select
                        value={formState.gradingCompany}
                        onChange={(e) => setFormState({ ...formState, gradingCompany: e.target.value })}
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
                        value={formState.grade}
                        onChange={(e) => setFormState({ ...formState, grade: e.target.value })}
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
                        value={formState.certNumber}
                        onChange={(e) => setFormState({ ...formState, certNumber: e.target.value })}
                        placeholder={t('Valfritt')}
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
                      value={formState.stockQuantity}
                      onChange={(e) => setFormState({ ...formState, stockQuantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 sm:pt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.isPreorder}
                        onChange={(e) => setFormState({ ...formState, isPreorder: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500"
                      />
                      <span>{t('Förhandsbokning (Preorder)')}</span>
                    </label>
                    {formState.isPreorder && (
                      <input
                        type="text"
                        value={formState.preorderLabel}
                        onChange={(e) => setFormState({ ...formState, preorderLabel: e.target.value })}
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
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder={t('Beskriv innehåll, skick, utgåva och leveransinformation...')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                {/* Product Images Section */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {t('Produktbilder')} ({formState.images.length})
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{uploading ? t('Laddar upp...') : t('Ladda upp bild från enhet')}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleModalImageUpload}
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
                          setFormState((prev) => ({
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

                  {formState.images.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {formState.images.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-900 group"
                        >
                          <SafeImage src={url} alt="" className="w-full h-full object-contain p-1" />
                          <button
                            type="button"
                            onClick={() =>
                              setFormState((prev) => ({
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
              </form>

              {/* Fixed Sticky Modal Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  form="b2c-product-form"
                  disabled={saving || updateMutation.isPending || uploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {saving || updateMutation.isPending
                      ? t('Sparar...')
                      : modalMode === 'edit'
                        ? t('Spara ändringar')
                        : t('Publicera på hatake.shop')}
                  </span>
                </button>
              </div>
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
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={() => setShowCatalogPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
            >
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
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

              <div className="p-4 border-b border-slate-800 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={t('Sök bland B2B-produkter (t.ex. Pokémon, Binder, Acrylic)...')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-800 overflow-y-auto flex-1 min-h-0 overscroll-contain">
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
