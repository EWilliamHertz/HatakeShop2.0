import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  ExternalLink,
  Edit2,
  Check,
  X,
  CheckSquare,
  Square,
  UserCheck,
  Send,
  Eye,
  Mail,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Globe2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Tag,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Settings2,
  RefreshCw,
  StickyNote,
  Building2,
} from 'lucide-react';

type LeadView = 'to-send' | 'sent' | 'engaged' | 'recruited' | 'failed' | 'all';

interface MailSettingRule {
  id?: number;
  name: string;
  country: string | null;
  state: string | null;
  city: string | null;
  segment: string | null;
  language: string;
  senderName: string;
  replyTo: string;
  subjectTemplate: string;
  headlineTemplate: string;
  introTemplate: string;
  regionalNote: string;
  ctaText: string;
  batchSize: number;
  isDefault: boolean;
}

const EMPTY_MAIL_RULE: MailSettingRule = {
  name: '',
  country: '',
  state: '',
  city: '',
  segment: '',
  language: 'en',
  senderName: 'Hatake B2B',
  replyTo: 'ernst@hatake.eu',
  subjectTemplate: '{{companyName}} ({{city}}) — Join Hatake.Shop B2B',
  headlineTemplate: "{{companyName}}, you're invited.",
  introTemplate:
    "Hi {{firstName}}, we'd like to invite {{companyName}} in {{city}}, {{country}} to join Hatake B2B — our international wholesale marketplace for sealed TCG inventory & direct-factory accessories.",
  regionalNote: '',
  ctaText: 'Create Your Company Profile',
  batchSize: 50,
  isDefault: false,
};

const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  Sweden: '🇸🇪',
  Germany: '🇩🇪',
  'United Kingdom': '🇬🇧',
  Norway: '🇳🇴',
  Denmark: '🇩🇰',
  Finland: '🇫🇮',
  Netherlands: '🇳🇱',
  France: '🇫🇷',
  Italy: '🇮🇹',
  Spain: '🇪🇸',
  Canada: '🇨🇦',
  Australia: '🇦🇺',
  Japan: '🇯🇵',
  China: '🇨🇳',
};

function getCountryFlag(country?: string | null): string {
  if (!country) return '🌐';
  return COUNTRY_FLAGS[country] || '🌍';
}

function inferLeadGeoClient(raw: any) {
  let country = raw.country ? String(raw.country).trim() : '';
  let state = raw.state ? String(raw.state).trim() : '';
  let city = raw.city ? String(raw.city).trim() : '';
  const location = raw.location ? String(raw.location).trim() : '';

  if ((!city || !state) && location) {
    const parts = location.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (!city && parts[0]) city = parts[0];
    if (!state && parts[1]) state = parts[1];
  }
  if (!country) {
    if (state === 'Hamburg' || state === 'Bremen' || state === 'Berlin') {
      country = 'Germany';
    } else if (raw.email && String(raw.email).toLowerCase().endsWith('.se')) {
      country = 'Sweden';
    } else if (raw.email && String(raw.email).toLowerCase().endsWith('.de')) {
      country = 'Germany';
    } else if (state) {
      country = 'United States';
    }
  }
  return { country, state, city, location };
}

function matchClientMailRule(lead: any, rules: MailSettingRule[]): MailSettingRule | null {
  if (!rules || rules.length === 0) return null;
  const lCountry = (lead.country || '').trim().toLowerCase();
  const lState = (lead.state || '').trim().toLowerCase();
  const lCity = (lead.city || '').trim().toLowerCase();
  const lSegment = (lead.segment || 'TCG').trim().toLowerCase();

  let best: MailSettingRule | null = null;
  let bestScore = -1;

  for (const r of rules) {
    const rCountry = (r.country || '').trim().toLowerCase();
    const rState = (r.state || '').trim().toLowerCase();
    const rCity = (r.city || '').trim().toLowerCase();
    const rSegment = (r.segment || '').trim().toLowerCase();

    if (rCountry && rCountry !== lCountry) continue;
    if (rState && rState !== lState) continue;
    if (rCity && rCity !== lCity) continue;
    if (rSegment && rSegment !== lSegment) continue;

    let score = 0;
    if (rCity) score += 8;
    if (rState) score += 4;
    if (rCountry) score += 2;
    if (rSegment) score += 1;
    if (score === 0 && r.isDefault) score = 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return best || rules.find(r => r.isDefault) || rules[0];
}

export function AdminLeadsTab({ leads: leadsProp, user, fetchAdminData, setPreviewingHtml }: any) {
  const leads: any[] = useMemo(() => {
    const arr = Array.isArray(leadsProp) ? leadsProp : [];
    return arr.map(l => {
      const geo = inferLeadGeoClient(l);
      return {
        ...l,
        country: geo.country,
        state: geo.state,
        city: geo.city,
        location: geo.location,
        tags: Array.isArray(l.tags) ? l.tags : [],
        socialLinks: Array.isArray(l.socialLinks)
          ? l.socialLinks
          : typeof l.socialLinks === 'string' && l.socialLinks
          ? [l.socialLinks]
          : [],
      };
    });
  }, [leadsProp]);

  // Pipeline & Geo / CRM Filters
  const [view, setView] = useState<LeadView>('to-send');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dataFilter, setDataFilter] = useState('all'); // 'all' | 'has-email' | 'has-website' | 'has-socials' | 'has-notes'
  const [sortBy, setSortBy] = useState<'newest' | 'company' | 'geo' | 'status'>('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Batch & Selection Queue (Default 50 mails)
  const [targetBatchSize, setTargetBatchSize] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showGeoExplorer, setShowGeoExplorer] = useState(true);

  // Mail Settings Studio
  const [mailRules, setMailRules] = useState<MailSettingRule[]>([]);
  const [showMailStudio, setShowMailStudio] = useState(false);
  const [editingRule, setEditingRule] = useState<MailSettingRule>(EMPTY_MAIL_RULE);
  const [savingRule, setSavingRule] = useState(false);
  const [dispatchRuleMode, setDispatchRuleMode] = useState<'auto' | string>('auto'); // 'auto' or String(rule.id)

  // Bulk Edit Controls
  const [bulkCountry, setBulkCountry] = useState('');
  const [bulkCity, setBulkCity] = useState('');
  const [bulkSegment, setBulkSegment] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Import & Sync States
  const [uploading, setUploading] = useState(false);
  const [importDefaultCountry, setImportDefaultCountry] = useState('');
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    show: false,
    duplicates: 0,
    added: 0,
  });
  const [projectFile, setProjectFile] = useState<{ available: boolean; filename?: string; sizeBytes?: number } | null>(null);
  const [syncingFile, setSyncingFile] = useState(false);
  const [syncingSwedish, setSyncingSwedish] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    isOpen: boolean;
    added: number;
    duplicates: number;
    total: number;
    source: string;
    duplicateSamples?: Array<{ email: string; companyName?: string; reason: string }>;
  } | null>(null);

  // Sending & Inline Row Edit States
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, show: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Manual Lead Modal
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [manualLead, setManualLead] = useState({
    businessName: '',
    email: '',
    website: '',
    country: 'Sweden',
    state: '',
    city: '',
    segment: 'TCG',
    phone: '',
    facebook: '',
    instagram: '',
    tags: '',
    notes: '',
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const getToken = useCallback(async () => {
    try {
      return await user?.getIdToken();
    } catch {
      return undefined;
    }
  }, [user]);

  const fetchMailRules = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api-v2/admin/leads/mail-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMailRules(data);
        }
      }
    } catch {
      // ignore
    }
  }, [getToken]);

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) return;
      fetchMailRules();
      try {
        const res = await fetch('/api-v2/admin/leads/available-file', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setProjectFile(await res.json());
        }
      } catch {
        // ignore
      }
    };
    init();
  }, [getToken, fetchMailRules]);

  // Pipeline Buckets
  const pipelineCounts = useMemo(() => {
    let toSend = 0;
    let sent = 0;
    let engaged = 0;
    let recruited = 0;
    let failed = 0;
    for (const l of leads) {
      const s = l.status || 'pending';
      if (s === 'pending') toSend++;
      else if (s === 'sent') sent++;
      else if (s === 'opened' || s === 'clicked') engaged++;
      else if (s === 'recruited') recruited++;
      else if (s === 'failed') failed++;
    }
    return {
      toSend,
      sent: sent + engaged,
      engaged,
      recruited,
      failed,
      all: leads.length,
    };
  }, [leads]);

  const viewBaseLeads = useMemo(() => {
    return leads.filter(l => {
      const s = l.status || 'pending';
      if (view === 'to-send') return s === 'pending';
      if (view === 'sent') return s === 'sent' || s === 'opened' || s === 'clicked';
      if (view === 'engaged') return s === 'opened' || s === 'clicked';
      if (view === 'recruited') return s === 'recruited';
      if (view === 'failed') return s === 'failed';
      return true;
    });
  }, [leads, view]);

  // Geo Aggregations (Countries -> States -> Cities + Tags)
  const geoStats = useMemo(() => {
    const countryMap = new Map<string, { total: number; pending: number }>();
    const stateMap = new Map<string, { total: number; pending: number }>();
    const cityMap = new Map<string, { total: number; pending: number; country: string; state: string }>();
    const tagSet = new Set<string>();

    for (const l of leads) {
      const c = l.country || 'Unassigned';
      const isPending = !l.status || l.status === 'pending';

      const cEntry = countryMap.get(c) || { total: 0, pending: 0 };
      cEntry.total++;
      if (isPending) cEntry.pending++;
      countryMap.set(c, cEntry);

      if (countryFilter === 'all' || c === countryFilter) {
        if (l.state) {
          const sEntry = stateMap.get(l.state) || { total: 0, pending: 0 };
          sEntry.total++;
          if (isPending) sEntry.pending++;
          stateMap.set(l.state, sEntry);
        }
        if (stateFilter === 'all' || l.state === stateFilter) {
          if (l.city) {
            const ctEntry = cityMap.get(l.city) || {
              total: 0,
              pending: 0,
              country: c,
              state: l.state || '',
            };
            ctEntry.total++;
            if (isPending) ctEntry.pending++;
            cityMap.set(l.city, ctEntry);
          }
        }
      }

      if (Array.isArray(l.tags)) {
        for (const t of l.tags) {
          if (t) tagSet.add(String(t));
        }
      }
    }

    const countries = Array.from(countryMap.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);

    const states = Array.from(stateMap.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);

    const cities = Array.from(cityMap.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);

    return {
      countries,
      states,
      cities,
      tags: Array.from(tagSet).sort(),
    };
  }, [leads, countryFilter, stateFilter]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = viewBaseLeads.filter(l => {
      const c = l.country || 'Unassigned';
      if (countryFilter !== 'all' && c !== countryFilter) return false;
      if (stateFilter !== 'all' && (l.state || '') !== stateFilter) return false;
      if (cityFilter !== 'all' && (l.city || '') !== cityFilter) return false;
      if (segmentFilter !== 'all' && (l.segment || 'TCG') !== segmentFilter) return false;
      if (tagFilter !== 'all' && !(Array.isArray(l.tags) && l.tags.includes(tagFilter))) return false;

      if (dataFilter === 'has-email' && !l.email) return false;
      if (dataFilter === 'has-website' && !l.website) return false;
      if (dataFilter === 'has-socials' && (!l.socialLinks || l.socialLinks.length === 0)) return false;
      if (dataFilter === 'has-notes' && !l.notes) return false;

      if (q) {
        const hay = [
          l.companyName,
          l.email,
          l.city,
          l.state,
          l.country,
          l.location,
          l.website,
          l.phone,
          l.notes,
          ...(l.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'company') {
        return String(a.companyName || '').localeCompare(String(b.companyName || ''));
      }
      if (sortBy === 'geo') {
        const ga = `${a.country || 'ZZZ'} ${a.state || ''} ${a.city || ''}`;
        const gb = `${b.country || 'ZZZ'} ${b.state || ''} ${b.city || ''}`;
        return ga.localeCompare(gb);
      }
      if (sortBy === 'status') {
        return String(a.status || 'pending').localeCompare(String(b.status || 'pending'));
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });

    return result;
  }, [
    viewBaseLeads,
    countryFilter,
    stateFilter,
    cityFilter,
    segmentFilter,
    tagFilter,
    dataFilter,
    searchQuery,
    sortBy,
  ]);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [view, countryFilter, stateFilter, cityFilter, segmentFilter, tagFilter, dataFilter, searchQuery, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPageLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  // Map by ID for instant queue lookup
  const leadsById = useMemo(() => {
    const m = new Map<number, any>();
    for (const l of leads) m.set(l.id, l);
    return m;
  }, [leads]);

  const selectedLeadsList = useMemo(() => {
    const out: any[] = [];
    for (const id of selectedIds) {
      const item = leadsById.get(id);
      if (item) out.push(item);
    }
    return out;
  }, [selectedIds, leadsById]);

  const pendingInFiltered = useMemo(
    () => filteredLeads.filter(l => (!l.status || l.status === 'pending') && l.email && l.email.includes('@')),
    [filteredLeads]
  );

  // Selection Helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPageLeads = () => {
    const allOnPageSelected =
      currentPageLeads.length > 0 && currentPageLeads.every(l => selectedIds.has(l.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const l of currentPageLeads) next.delete(l.id);
      } else {
        for (const l of currentPageLeads) next.add(l.id);
      }
      return next;
    });
  };

  const selectExactBatchFromFilter = (count: number = targetBatchSize, replaceExisting = true) => {
    const pool = pendingInFiltered.length > 0 ? pendingInFiltered : filteredLeads.filter(l => l.email);
    if (pool.length === 0) {
      toast.warning('No eligible leads with email in current filter.');
      return;
    }

    setSelectedIds(prev => {
      const next = replaceExisting ? new Set<number>() : new Set<number>(prev);
      let added = 0;
      for (const l of pool) {
        if (next.size >= (replaceExisting ? count : Math.max(count, prev.size + count))) break;
        if (!next.has(l.id)) {
          next.add(l.id);
          added++;
          if (!replaceExisting && next.size >= targetBatchSize && prev.size < targetBatchSize) {
            break;
          }
        }
      }
      toast.success(
        replaceExisting
          ? `Queued ${next.size} lead${next.size === 1 ? '' : 's'} from current filter.`
          : `Added ${added} lead${added === 1 ? '' : 's'} to queue (Total queued: ${next.size}).`
      );
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (filteredLeads.length === 0) return;
    setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    toast.success(`Selected all ${filteredLeads.length.toLocaleString()} leads in current filter.`);
  };

  // Active Mail Rule resolution
  const selectedOverrideRule = useMemo(() => {
    if (dispatchRuleMode === 'auto') return null;
    return mailRules.find(r => String(r.id) === dispatchRuleMode) || null;
  }, [dispatchRuleMode, mailRules]);

  // Preview Email with actual lead & active geo/custom rule
  const handlePreviewEmail = async (sampleLeadOverride?: any, customRuleOverride?: MailSettingRule) => {
    const token = await getToken();
    if (!token) return toast.error('Authentication required');

    const sampleLead =
      sampleLeadOverride ||
      selectedLeadsList[0] ||
      filteredLeads[0] || {
        companyName: 'Stockholm Kort & Spel AB',
        city: cityFilter !== 'all' ? cityFilter : 'Stockholm',
        state: stateFilter !== 'all' ? stateFilter : '',
        country: countryFilter !== 'all' ? countryFilter : 'Sweden',
        segment: segmentFilter !== 'all' ? segmentFilter : 'TCG',
        email: 'demo@example.com',
      };

    const explicitRule = customRuleOverride || selectedOverrideRule;

    try {
      const res = await fetch('/api-v2/admin/leads/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead: sampleLead,
          mailSettings: explicitRule || undefined,
          useAutoGeoRule: !explicitRule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      toast.info(`Previewing "${data.subject}" (${data.matchedRuleName})`);
      setPreviewingHtml(data.html);
    } catch (e: any) {
      toast.error(e.message || 'Failed to render email preview');
    }
  };

  // Save / Delete Geo Mail Rule
  const handleSaveMailRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule.name.trim() || !editingRule.subjectTemplate.trim()) {
      return toast.error('Rule name and subject template are required.');
    }
    setSavingRule(true);
    try {
      const token = await getToken();
      const isEdit = Boolean(editingRule.id);
      const url = isEdit
        ? `/api-v2/admin/leads/mail-settings/${editingRule.id}`
        : '/api-v2/admin/leads/mail-settings';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editingRule,
          country: editingRule.country?.trim() || null,
          state: editingRule.state?.trim() || null,
          city: editingRule.city?.trim() || null,
          segment: editingRule.segment?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save mail rule');
      toast.success(isEdit ? 'Mail rule updated!' : 'New geo mail rule saved!');
      await fetchMailRules();
      setEditingRule(data);
    } catch (err: any) {
      toast.error(err.message || 'Error saving mail rule');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteMailRule = async (id?: number) => {
    if (!id) return;
    if (!confirm('Delete this mail settings profile?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api-v2/admin/leads/mail-settings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Mail rule deleted');
      if (editingRule.id === id) setEditingRule(EMPTY_MAIL_RULE);
      if (dispatchRuleMode === String(id)) setDispatchRuleMode('auto');
      fetchMailRules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete mail rule');
    }
  };

  // Send Campaign (Selected Queue OR Filtered Batch of N=50)
  const executeBatchSend = async (mode: 'selected' | 'filtered-batch') => {
    const countToSend =
      mode === 'selected'
        ? selectedIds.size
        : Math.min(targetBatchSize, pendingInFiltered.length);

    if (countToSend === 0) {
      return toast.error(
        mode === 'selected'
          ? 'Select leads first (or click "Select 50 Pending in Filter").'
          : 'No pending leads match your active filter.'
      );
    }

    const scopeSummary =
      mode === 'selected'
        ? `${countToSend} queued/selected lead(s)`
        : `next ${countToSend} pending lead(s) in current filter (${
            countryFilter !== 'all' ? countryFilter : 'All Countries'
          }${cityFilter !== 'all' ? ` • ${cityFilter}` : ''})`;

    const ruleSummary =
      dispatchRuleMode === 'auto'
        ? 'Auto-Match Country/City Mail Rules'
        : `Rule: "${selectedOverrideRule?.name}"`;

    if (!confirm(`Dispatch B2B invitations to ${scopeSummary}?\nMail Settings: ${ruleSummary}`)) {
      return;
    }

    setSending(true);
    setSendProgress({ current: 0, total: countToSend, show: true });
    const interval = setInterval(() => {
      setSendProgress(prev =>
        prev.current < Math.max(1, prev.total - 3)
          ? { ...prev, current: prev.current + Math.max(1, Math.floor(prev.total / 12)) }
          : prev
      );
    }, 300);

    try {
      const token = await getToken();
      const payload: Record<string, any> = {
        limit: targetBatchSize,
        useAutoGeoRules: dispatchRuleMode === 'auto',
        mailSettings: selectedOverrideRule ? { ...selectedOverrideRule, overrideAll: true } : undefined,
      };

      if (mode === 'selected') {
        payload.leadIds = Array.from(selectedIds);
      } else {
        payload.leadIds = pendingInFiltered.slice(0, targetBatchSize).map(l => l.id);
      }

      const res = await fetch('/api-v2/admin/leads/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      clearInterval(interval);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Dispatch failed');
      }

      setSendProgress({ current: data.sent, total: countToSend, show: true });
      setTimeout(() => setSendProgress(p => ({ ...p, show: false })), 2500);

      toast.success(`Dispatched ${data.sent} personalized invitation${data.sent === 1 ? '' : 's'}!`);
      setSelectedIds(new Set());
      setShowQueueModal(false);
      fetchAdminData?.();
    } catch (e: any) {
      clearInterval(interval);
      setSendProgress(p => ({ ...p, show: false }));
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // Single & Bulk Lead Updates
  const handleUpdateLeadStatus = async (id: number, status: string) => {
    try {
      const token = await getToken();
      await fetch(`/api-v2/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      fetchAdminData?.();
      toast.success(`Lead marked as ${status}`);
    } catch {
      toast.error('Error updating status');
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api-v2/admin/leads/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Lead updated');
      setEditingId(null);
      fetchAdminData?.();
    } catch {
      toast.error('Failed to update lead');
    }
  };

  const handleBulkAction = async (customAction?: 'delete') => {
    if (selectedIds.size === 0) return toast.error('Select leads first');
    if (customAction === 'delete') {
      if (!confirm(`Permanently delete ${selectedIds.size} selected lead(s)?`)) return;
    } else if (!bulkCountry && !bulkCity && !bulkSegment && !bulkTag && !bulkStatus) {
      return toast.warning('Choose at least one bulk field (Country, City, Segment, Tag, or Status) to apply.');
    }

    setApplyingBulk(true);
    try {
      const token = await getToken();
      const res = await fetch('/api-v2/admin/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          action: customAction,
          country: bulkCountry || undefined,
          city: bulkCity || undefined,
          segment: bulkSegment || undefined,
          addTag: bulkTag || undefined,
          status: bulkStatus || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');
      toast.success(
        customAction === 'delete'
          ? `Deleted ${data.updated} lead(s).`
          : `Updated ${data.updated} lead(s) successfully.`
      );
      if (customAction === 'delete') setSelectedIds(new Set());
      setBulkCountry('');
      setBulkCity('');
      setBulkSegment('');
      setBulkTag('');
      setBulkStatus('');
      fetchAdminData?.();
    } catch (e: any) {
      toast.error(e.message || 'Bulk action failed');
    } finally {
      setApplyingBulk(false);
    }
  };

  const handleExportCsv = (onlySelected: boolean) => {
    const rows = onlySelected ? selectedLeadsList : filteredLeads;
    if (rows.length === 0) return toast.warning('No leads to export');
    const csv = Papa.unparse(
      rows.map(l => ({
        Company: l.companyName || '',
        Email: l.email || '',
        Country: l.country || '',
        State: l.state || '',
        City: l.city || '',
        Segment: l.segment || 'TCG',
        Status: l.status || 'pending',
        Website: l.website || '',
        Phone: l.phone || '',
        Tags: (l.tags || []).join(', '),
        Notes: l.notes || '',
        Socials: (l.socialLinks || []).join(', '),
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hatake-crm-leads-${onlySelected ? 'selected' : countryFilter.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Manual Lead Add
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.email || !manualLead.businessName) return;
    setIsSubmittingManual(true);
    try {
      const token = await getToken();
      const newLeads = [
        {
          'Business Name': manualLead.businessName,
          Email: manualLead.email,
          Website: manualLead.website,
          Country: manualLead.country,
          State: manualLead.state,
          City: manualLead.city,
          Segment: manualLead.segment,
          Phone: manualLead.phone,
          Facebook: manualLead.facebook,
          Instagram: manualLead.instagram,
          Tags: manualLead.tags,
          Notes: manualLead.notes,
        },
      ];
      const res = await fetch('/api-v2/admin/leads/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          leads: newLeads,
          defaultCountry: manualLead.country || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lead');
      if (data.duplicates > 0) {
        toast.warning(`Lead (${manualLead.email}) already exists in CRM.`);
      } else {
        toast.success(`Added ${manualLead.businessName} to CRM!`);
      }
      setIsManualAddModalOpen(false);
      setManualLead({
        businessName: '',
        email: '',
        website: '',
        country: countryFilter !== 'all' && countryFilter !== 'Unassigned' ? countryFilter : 'Sweden',
        state: '',
        city: '',
        segment: 'TCG',
        phone: '',
        facebook: '',
        instagram: '',
        tags: '',
        notes: '',
      });
      fetchAdminData?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add lead');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleSyncSwedishShops = async () => {
    setSyncingSwedish(true);
    try {
      const token = await getToken();
      const res = await fetch('/api-v2/admin/leads/sync-swedish-shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync Swedish shops');
      toast.success(
        `Swedish Kortbutiker synced: +${data.added} added, ${data.duplicates} already in CRM.`
      );
      fetchAdminData?.();
    } catch (e: any) {
      toast.error(e.message || 'Error syncing Swedish shops');
    } finally {
      setSyncingSwedish(false);
    }
  };

  const handleSyncProjectFile = async () => {
    const filename = projectFile?.filename || 'Pokemon_Card_Stores.csv';
    if (!confirm(`Import leads from "${filename}"? Duplicates will be skipped automatically.`)) return;
    setSyncingFile(true);
    try {
      const token = await getToken();
      const res = await fetch('/api-v2/admin/leads/sync-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      setImportSummary({
        isOpen: true,
        added: data.added || 0,
        duplicates: data.duplicates || 0,
        total: data.total || 0,
        source: data.filename || filename,
        duplicateSamples: data.duplicateSamples || [],
      });
      fetchAdminData?.();
    } catch (err: any) {
      toast.error(err.message || 'Error syncing project file');
    } finally {
      setSyncingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^[\ufeff\s"']+|["'\s]+$/g, '').trim(),
      complete: async results => {
        try {
          const token = await getToken();
          const allRows: any[] = results.data || [];
          if (allRows.length === 0) {
            toast.error('CSV contains no rows.');
            setUploading(false);
            return;
          }

          const CHUNK_SIZE = 500;
          let totalAdded = 0;
          let totalDuplicates = 0;
          const allDuplicateSamples: any[] = [];

          setUploadProgress({ current: 0, total: allRows.length, show: true, duplicates: 0, added: 0 });

          for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
            const chunk = allRows.slice(i, i + CHUNK_SIZE);
            const res = await fetch('/api-v2/admin/leads/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                leads: chunk,
                defaultCountry: importDefaultCountry || undefined,
              }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Upload failed at row ${i + 1}`);
            }
            const data = await res.json();
            totalAdded += data.added || 0;
            totalDuplicates += data.duplicates || 0;
            if (Array.isArray(data.duplicateSamples)) {
              allDuplicateSamples.push(...data.duplicateSamples);
            }
            setUploadProgress({
              current: Math.min(i + chunk.length, allRows.length),
              total: allRows.length,
              show: true,
              duplicates: totalDuplicates,
              added: totalAdded,
            });
          }

          setImportSummary({
            isOpen: true,
            added: totalAdded,
            duplicates: totalDuplicates,
            total: allRows.length,
            source: file.name,
            duplicateSamples: allDuplicateSamples.slice(0, 50),
          });
          fetchAdminData?.();
        } catch (err: any) {
          toast.error(err.message || 'Error importing CSV');
        } finally {
          setUploading(false);
          setTimeout(() => setUploadProgress(p => ({ ...p, show: false })), 3000);
          e.target.value = '';
        }
      },
      error: err => {
        setUploading(false);
        toast.error(`CSV parse error: ${err.message}`);
      },
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-slate-800 text-slate-300 border-slate-700',
      sent: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      opened: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      clicked: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      recruited: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      failed: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return map[status] || map.pending;
  };

  const pipelineTabs: { key: LeadView; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'to-send', label: 'To Send', count: pipelineCounts.toSend, icon: <Send className="w-3.5 h-3.5" /> },
    { key: 'sent', label: 'Contacted', count: pipelineCounts.sent, icon: <Mail className="w-3.5 h-3.5" /> },
    { key: 'engaged', label: 'Opened / Clicked', count: pipelineCounts.engaged, icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'recruited', label: 'Recruited', count: pipelineCounts.recruited, icon: <UserCheck className="w-3.5 h-3.5" /> },
    { key: 'failed', label: 'Failed', count: pipelineCounts.failed, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { key: 'all', label: 'All CRM Leads', count: pipelineCounts.all, icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  const insertVarIntoField = (field: 'subjectTemplate' | 'headlineTemplate' | 'introTemplate' | 'regionalNote', tokenStr: string) => {
    setEditingRule(prev => ({
      ...prev,
      [field]: `${prev[field] || ''}${prev[field] ? ' ' : ''}${tokenStr}`,
    }));
  };

  const allOnPageChecked =
    currentPageLeads.length > 0 && currentPageLeads.every(l => selectedIds.has(l.id));

  return (
    <div className="space-y-5">
      {/* 1. CRM Header + Quick Import / Mail Settings / 50-Mail Campaign Dispatch */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                B2B Partner CRM
              </span>
              <span className="text-xs text-slate-400">
                {leads.length.toLocaleString()} total companies • {geoStats.countries.length} countries • {mailRules.length} geo mail rules
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Partner Outreach & Geo-Targeted Mail CRM
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManualAddModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>

            <button
              type="button"
              onClick={handleSyncSwedishShops}
              disabled={syncingSwedish}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Import Swedish card shops (with email) into CRM under Country = Sweden"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSwedish ? 'animate-spin' : ''}`} />
              🇸🇪 Sync Swedish Shops
            </button>

            <div className="inline-flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <input
                type="text"
                placeholder="CSV Country (optional)"
                value={importDefaultCountry}
                onChange={e => setImportDefaultCountry(e.target.value)}
                className="bg-transparent px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-36 outline-none border-r border-slate-700"
              />
              <label className="cursor-pointer bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-3 py-2 text-xs font-bold transition-colors inline-flex items-center gap-1">
                {uploading ? 'Importing…' : '↑ Import CSV'}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={uploading || syncingFile}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {projectFile?.available && (
              <button
                type="button"
                onClick={handleSyncProjectFile}
                disabled={syncingFile || uploading}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {syncingFile ? 'Syncing…' : 'Sync Project CSV'}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleExportCsv(selectedIds.size > 0)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export {selectedIds.size > 0 ? `(${selectedIds.size})` : 'CSV'}
            </button>

            <button
              type="button"
              onClick={() => setShowMailStudio(s => !s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all ${
                showMailStudio
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20'
                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Geo Mail Settings ({mailRules.length})
            </button>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress.show && (
          <div className="mt-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between font-semibold">
              <span className="text-cyan-400">
                Importing CSV ({uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()})
              </span>
              <span>
                <span className="text-emerald-400">+{uploadProgress.added} added</span> •{' '}
                <span className="text-amber-400">{uploadProgress.duplicates} duplicates skipped</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all"
                style={{ width: `${Math.min(100, (uploadProgress.current / (uploadProgress.total || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 50-Mail Batch Organizer & Campaign Dispatch Strip */}
        <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
          {/* Batch Size & Quick Select */}
          <div className="xl:col-span-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Batch:</span>
              <input
                type="number"
                min={1}
                max={200}
                value={targetBatchSize}
                onChange={e => setTargetBatchSize(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
                className="w-12 bg-slate-800 text-white font-bold text-xs text-center rounded px-1 py-0.5 border border-slate-700 outline-none"
              />
              <span className="text-[11px] text-slate-400">mails</span>
            </div>

            <button
              type="button"
              onClick={() => selectExactBatchFromFilter(targetBatchSize, true)}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              title="Select the first N pending leads from your active Country / City / Search filter"
            >
              <ListChecks className="w-3.5 h-3.5" />
              Select {targetBatchSize} Pending in Filter ({Math.min(targetBatchSize, pendingInFiltered.length)})
            </button>

            {selectedIds.size > 0 && selectedIds.size < targetBatchSize && (
              <button
                type="button"
                onClick={() => selectExactBatchFromFilter(targetBatchSize - selectedIds.size, false)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                title="Add leads from current filter until your queue reaches your target batch size"
              >
                + Top Up Queue to {targetBatchSize}
              </button>
            )}
          </div>

          {/* Active Mail Settings Mode */}
          <div className="xl:col-span-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={dispatchRuleMode}
              onChange={e => setDispatchRuleMode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="auto">✨ Auto-Match Geo Rule (City → State → Country)</option>
              {mailRules.map(r => (
                <option key={r.id} value={String(r.id)}>
                  📌 Force Rule: {r.name} ({r.language?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Preview + Review Queue + Dispatch Buttons */}
          <div className="xl:col-span-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handlePreviewEmail()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Preview Mail
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setShowQueueModal(true)}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                Queue ({selectedIds.size}/{targetBatchSize})
              </button>
            )}

            {selectedIds.size > 0 ? (
              <button
                type="button"
                disabled={sending}
                onClick={() => executeBatchSend('selected')}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-black shadow-lg shadow-indigo-600/25 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Sending…' : `Send Selected (${selectedIds.size})`}
              </button>
            ) : (
              <button
                type="button"
                disabled={sending || pendingInFiltered.length === 0}
                onClick={() => executeBatchSend('filtered-batch')}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-black shadow-lg shadow-cyan-600/20 inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {sending
                  ? `Sending (${sendProgress.current}/${sendProgress.total})…`
                  : `Send ${Math.min(targetBatchSize, pendingInFiltered.length)} in Filter`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Geo Mail Settings Studio (Expandable Panel) */}
      {showMailStudio && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                Geo-Targeted Mail Settings (Country / State / City / Segment)
              </h3>
              <p className="text-xs text-slate-400">
                Configure localized subjects, sender names, languages, and regional notes. Most specific rule automatically matches each lead: <strong className="text-slate-200">City → State/Region → Country → Global Default</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditingRule({
                    ...EMPTY_MAIL_RULE,
                    name:
                      cityFilter !== 'all'
                        ? `${cityFilter} (${countryFilter !== 'all' ? countryFilter : 'City'}) Campaign`
                        : countryFilter !== 'all'
                        ? `${countryFilter} B2B Campaign`
                        : 'New Geo Mail Rule',
                    country: countryFilter !== 'all' && countryFilter !== 'Unassigned' ? countryFilter : '',
                    state: stateFilter !== 'all' ? stateFilter : '',
                    city: cityFilter !== 'all' ? cityFilter : '',
                    segment: segmentFilter !== 'all' ? segmentFilter : '',
                    language:
                      countryFilter === 'Sweden'
                        ? 'sv'
                        : countryFilter === 'Germany'
                        ? 'de'
                        : 'en',
                  })
                }
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Rule from Active Filter
              </button>
              <button
                type="button"
                onClick={() => setShowMailStudio(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Saved Geo Rules List */}
            <div className="lg:col-span-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Saved Mail Rules ({mailRules.length})
              </div>
              {mailRules.map(rule => {
                const isSelected = editingRule.id === rule.id;
                return (
                  <div
                    key={rule.id}
                    onClick={() =>
                      setEditingRule({
                        ...EMPTY_MAIL_RULE,
                        ...rule,
                        country: rule.country || '',
                        state: rule.state || '',
                        city: rule.city || '',
                        segment: rule.segment || '',
                        headlineTemplate: rule.headlineTemplate || '',
                        introTemplate: rule.introTemplate || '',
                        regionalNote: rule.regionalNote || '',
                        ctaText: rule.ctaText || '',
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-400 shadow-md'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{getCountryFlag(rule.country)}</span>
                        <span>{rule.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-bold uppercase text-cyan-300 border border-slate-700">
                          {rule.language || 'en'}
                        </span>
                        {rule.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-400 truncate">
                      Subj: <span className="text-slate-300">{rule.subjectTemplate}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                      <span>
                        {[rule.country || 'Global', rule.state, rule.city, rule.segment]
                          .filter(Boolean)
                          .join(' › ')}
                      </span>
                      {!rule.isDefault && rule.id && (
                        <button
                          type="button"
                          onClick={ev => {
                            ev.stopPropagation();
                            handleDeleteMailRule(rule.id);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-0.5"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rule Editor Form */}
            <form onSubmit={handleSaveMailRule} className="lg:col-span-8 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {editingRule.id ? `Editing Rule #${editingRule.id}` : 'Create New Geo Mail Rule'}
                </span>
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-500 mr-1">Insert Variable (into Subject):</span>
                  {['{{companyName}}', '{{firstName}}', '{{city}}', '{{state}}', '{{country}}', '{{segment}}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVarIntoField('subjectTemplate', v)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-slate-700"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={editingRule.name}
                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g. Sweden — Stockholm Kortbutiker"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Template Language</label>
                  <select
                    value={editingRule.language}
                    onChange={e => setEditingRule({ ...editingRule, language: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="en">🇬🇧 English (Global / US / UK)</option>
                    <option value="sv">🇸🇪 Svenska (Sweden)</option>
                    <option value="de">🇩🇪 Deutsch (Germany / DACH)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Country</label>
                  <input
                    type="text"
                    value={editingRule.country || ''}
                    onChange={e => setEditingRule({ ...editingRule, country: e.target.value })}
                    placeholder="Any (Global)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={editingRule.state || ''}
                    onChange={e => setEditingRule({ ...editingRule, state: e.target.value })}
                    placeholder="Any State"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target City</label>
                  <input
                    type="text"
                    value={editingRule.city || ''}
                    onChange={e => setEditingRule({ ...editingRule, city: e.target.value })}
                    placeholder="Any City"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Segment</label>
                  <select
                    value={editingRule.segment || ''}
                    onChange={e => setEditingRule({ ...editingRule, segment: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="">All Segments</option>
                    <option value="TCG">TCG</option>
                    <option value="Sports">Sports</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={editingRule.senderName}
                    onChange={e => setEditingRule({ ...editingRule, senderName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reply-To Address</label>
                  <input
                    type="email"
                    value={editingRule.replyTo}
                    onChange={e => setEditingRule({ ...editingRule, replyTo: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={editingRule.ctaText}
                    onChange={e => setEditingRule({ ...editingRule, ctaText: e.target.value })}
                    placeholder="Create Your Company Profile"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Subject Line *</label>
                <input
                  type="text"
                  required
                  value={editingRule.subjectTemplate}
                  onChange={e => setEditingRule({ ...editingRule, subjectTemplate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hero Headline</label>
                <input
                  type="text"
                  value={editingRule.headlineTemplate}
                  onChange={e => setEditingRule({ ...editingRule, headlineTemplate: e.target.value })}
                  placeholder="{{companyName}}, you're invited."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Personalized Intro Copy (supports {'{{companyName}}'}, {'{{city}}'}, {'{{state}}'}, {'{{country}}'})
                </label>
                <textarea
                  rows={2}
                  value={editingRule.introTemplate}
                  onChange={e => setEditingRule({ ...editingRule, introTemplate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Regional Shipping / Partner Callout Box (optional)
                </label>
                <input
                  type="text"
                  value={editingRule.regionalNote}
                  onChange={e => setEditingRule({ ...editingRule, regionalNote: e.target.value })}
                  placeholder="e.g. Fast tracked wholesale delivery direct to {{city}}, {{country}}."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.isDefault}
                    onChange={e => setEditingRule({ ...editingRule, isDefault: e.target.checked })}
                    className="rounded border-slate-600"
                  />
                  Set as Global Fallback Default
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreviewEmail(undefined, editingRule)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Test Preview
                  </button>
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {savingRule ? 'Saving…' : editingRule.id ? 'Save Rule Changes' : 'Create Geo Rule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Pipeline Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {pipelineTabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            className={`rounded-xl border p-3.5 text-left transition-all ${
              view === t.key
                ? 'bg-slate-800 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 mb-1 text-[11px] font-bold uppercase tracking-wider ${
                view === t.key ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              {t.icon} {t.label}
            </div>
            <div className={`text-xl font-black tabular-nums ${view === t.key ? 'text-white' : 'text-slate-300'}`}>
              {t.count.toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      {/* 4. Interactive Country, State & City Geo Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <span>Geographic CRM Directory (Click Country → State/Region → City to drill down)</span>
          </div>
          <div className="flex items-center gap-2">
            {(countryFilter !== 'all' || stateFilter !== 'all' || cityFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setCountryFilter('all');
                  setStateFilter('all');
                  setCityFilter('all');
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
              >
                Reset Geo Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowGeoExplorer(v => !v)}
              className="text-xs text-slate-400 hover:text-white font-semibold"
            >
              {showGeoExplorer ? 'Hide Map Pills' : 'Show Map Pills'}
            </button>
          </div>
        </div>

        {showGeoExplorer && (
          <div className="space-y-2.5">
            {/* Country Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCountryFilter('all');
                  setStateFilter('all');
                  setCityFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  countryFilter === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                🌍 All Countries ({leads.length.toLocaleString()})
              </button>
              {geoStats.countries.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setCountryFilter(c.name);
                    setStateFilter('all');
                    setCityFilter('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors inline-flex items-center gap-1.5 ${
                    countryFilter === c.name
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span>{getCountryFlag(c.name)}</span>
                  <span>{c.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-400">
                    {c.pending.toLocaleString()} pending / {c.total.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            {/* Top States / Regions when Country has states */}
            {geoStats.states.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                  Regions / States:
                </span>
                {geoStats.states.slice(0, 18).map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setStateFilter(stateFilter === s.name ? 'all' : s.name);
                      setCityFilter('all');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 transition-colors ${
                      stateFilter === s.name
                        ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {s.name} ({s.pending})
                  </button>
                ))}
              </div>
            )}

            {/* Top Cities Pills */}
            {geoStats.cities.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                  <MapPin className="w-3 h-3 inline mr-0.5" />
                  Top Cities:
                </span>
                {geoStats.cities.slice(0, 18).map(ct => (
                  <button
                    key={ct.name}
                    type="button"
                    onClick={() => setCityFilter(cityFilter === ct.name ? 'all' : ct.name)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 transition-colors ${
                      cityFilter === ct.name
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {ct.name} ({ct.pending})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Multi-Facet Filter Bar & Bulk CRM Action Bar */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {/* Search + Dropdown Filters */}
        <div className="bg-slate-900 p-4 border-b border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search company, email, city, notes, tags…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={countryFilter}
              onChange={e => {
                setCountryFilter(e.target.value);
                setStateFilter('all');
                setCityFilter('all');
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="all">All Countries ({geoStats.countries.length})</option>
              {geoStats.countries.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.total})
                </option>
              ))}
            </select>

            <select
              value={stateFilter}
              onChange={e => {
                setStateFilter(e.target.value);
                setCityFilter('all');
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="all">All States / Regions ({geoStats.states.length})</option>
              {geoStats.states.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.total})
                </option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="all">All Cities ({geoStats.cities.length})</option>
              {geoStats.cities.slice(0, 300).map(ct => (
                <option key={ct.name} value={ct.name}>
                  {ct.name} ({ct.total})
                </option>
              ))}
            </select>

            <select
              value={segmentFilter}
              onChange={e => setSegmentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="all">All Segments</option>
              <option value="TCG">TCG</option>
              <option value="Sports">Sports</option>
              <option value="General">General</option>
            </select>

            <div className="flex gap-1.5">
              <select
                value={dataFilter}
                onChange={e => setDataFilter(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-200 outline-none"
              >
                <option value="all">All Data</option>
                <option value="has-website">Has Website</option>
                <option value="has-socials">Has Socials</option>
                <option value="has-notes">Has Notes</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-200 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="company">A–Z Name</option>
                <option value="geo">Country/City</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Selection Summary & Quick Batch Picker */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-200">
                Showing {filteredLeads.length.toLocaleString()} leads
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-semibold">
                {pendingInFiltered.length.toLocaleString()} ready to send
              </span>
              {geoStats.tags.length > 0 && (
                <select
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none"
                >
                  <option value="all">All Tags</option>
                  {geoStats.tags.map(t => (
                    <option key={t} value={t}>
                      🏷️ {t}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => selectExactBatchFromFilter(targetBatchSize, true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold"
              >
                Select {targetBatchSize} in View
              </button>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold"
              >
                Select All {filteredLeads.length.toLocaleString()} Filtered
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold"
                >
                  Clear ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk CRM Organize Bar (Appears when 1+ leads are selected) */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-950/40 px-4 py-3 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>{selectedIds.size} Lead(s) Selected — Bulk Organize:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Set Country…"
                value={bulkCountry}
                onChange={e => setBulkCountry(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-28 outline-none"
              />
              <input
                type="text"
                placeholder="Set City…"
                value={bulkCity}
                onChange={e => setBulkCity(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-28 outline-none"
              />
              <select
                value={bulkSegment}
                onChange={e => setBulkSegment(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
              >
                <option value="">Segment…</option>
                <option value="TCG">TCG</option>
                <option value="Sports">Sports</option>
                <option value="General">General</option>
              </select>
              <input
                type="text"
                placeholder="Add Tag…"
                value={bulkTag}
                onChange={e => setBulkTag(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-24 outline-none"
              />
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
              >
                <option value="">Status…</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="recruited">Recruited</option>
              </select>

              <button
                type="button"
                disabled={applyingBulk}
                onClick={() => handleBulkAction()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {applyingBulk ? 'Applying…' : 'Apply to Selected'}
              </button>

              <button
                type="button"
                onClick={() => setShowQueueModal(true)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold"
              >
                Review & Send ({selectedIds.size})
              </button>

              <button
                type="button"
                disabled={applyingBulk}
                onClick={() => handleBulkAction('delete')}
                className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                title="Delete selected leads"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* High-Performance Paginated CRM Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button
                    type="button"
                    onClick={selectPageLeads}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Select/deselect all rows on current page"
                  >
                    {allOnPageChecked ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-3">Company & Segment</th>
                <th className="px-3 py-3">Email & Contact</th>
                <th className="px-3 py-3">Country / City</th>
                <th className="px-3 py-3">Web & Socials</th>
                <th className="px-3 py-3">CRM Notes & Tags</th>
                <th className="px-3 py-3">Status & Geo Rule</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {currentPageLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Globe2 className="w-10 h-10 text-slate-600" />
                      <div className="text-base font-bold text-white">No leads match current filters</div>
                      <p className="text-xs text-slate-500">
                        Try clearing a country/city filter or switching pipeline tabs above.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {currentPageLeads.map((lead: any) => {
                const isSelected = selectedIds.has(lead.id);
                const isEditing = editingId === lead.id;
                const matchedRule = selectedOverrideRule || matchClientMailRule(lead, mailRules);

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-cyan-950/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(lead.id)}
                        className={isSelected ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Company & Segment */}
                    <td className="px-3 py-3 max-w-[210px]">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-xs text-white"
                            value={editData.companyName || ''}
                            onChange={e => setEditData({ ...editData, companyName: e.target.value })}
                          />
                          <select
                            value={editData.segment || 'TCG'}
                            onChange={e => setEditData({ ...editData, segment: e.target.value })}
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-slate-200"
                          >
                            <option value="TCG">TCG</option>
                            <option value="Sports">Sports</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-white truncate" title={lead.companyName || ''}>
                            {lead.companyName || 'Unnamed Store'}
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                            {lead.segment || 'TCG'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Email & Phone */}
                    <td className="px-3 py-3 max-w-[200px]">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="email"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 w-full text-xs text-white"
                            value={editData.email || ''}
                            onChange={e => setEditData({ ...editData, email: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-slate-300"
                            value={editData.phone || ''}
                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-slate-200 truncate font-mono" title={lead.email}>
                            {lead.email || <span className="text-rose-400">Missing</span>}
                          </div>
                          {lead.phone && <div className="text-[11px] text-slate-500">{lead.phone}</div>}
                        </div>
                      )}
                    </td>

                    {/* Country / State / City */}
                    <td className="px-3 py-3 max-w-[190px]">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Country"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-white"
                            value={editData.country || ''}
                            onChange={e => setEditData({ ...editData, country: e.target.value })}
                          />
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="City"
                              className="bg-slate-950 border border-slate-600 rounded px-1.5 py-0.5 w-1/2 text-[11px] text-white"
                              value={editData.city || ''}
                              onChange={e => setEditData({ ...editData, city: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="State"
                              className="bg-slate-950 border border-slate-600 rounded px-1.5 py-0.5 w-1/2 text-[11px] text-white"
                              value={editData.state || ''}
                              onChange={e => setEditData({ ...editData, state: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                            <span>{getCountryFlag(lead.country)}</span>
                            <button
                              type="button"
                              onClick={() => lead.country && setCountryFilter(lead.country)}
                              className="hover:text-cyan-400 truncate"
                            >
                              {lead.country || 'Unassigned'}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {lead.city ? (
                              <button
                                type="button"
                                onClick={() => setCityFilter(lead.city)}
                                className="hover:text-emerald-300"
                              >
                                {lead.city}
                              </button>
                            ) : (
                              '-'
                            )}
                            {lead.state ? `, ${lead.state}` : ''}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Website & Socials */}
                    <td className="px-3 py-3 max-w-[160px]">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Website"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-white"
                            value={editData.website || ''}
                            onChange={e => setEditData({ ...editData, website: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Social URLs, comma sep"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-white"
                            value={(editData.socialLinks || []).join(', ')}
                            onChange={e =>
                              setEditData({
                                ...editData,
                                socialLinks: e.target.value
                                  .split(',')
                                  .map((s: string) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline inline-flex items-center gap-1 text-xs max-w-[150px] truncate"
                            >
                              {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                          {Array.isArray(lead.socialLinks) && lead.socialLinks.length > 0 && (
                            <div className="flex gap-1">
                              {lead.socialLinks.slice(0, 2).map((link: string, i: number) => (
                                <a
                                  key={i}
                                  href={link.startsWith('http') ? link : `https://${link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] bg-slate-900 hover:bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700"
                                >
                                  Social {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* CRM Notes & Tags */}
                    <td className="px-3 py-3 max-w-[190px]">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Notes…"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-white"
                            value={editData.notes || ''}
                            onChange={e => setEditData({ ...editData, notes: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Tags (comma sep)"
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 w-full text-[11px] text-white"
                            value={(editData.tags || []).join(', ')}
                            onChange={e =>
                              setEditData({
                                ...editData,
                                tags: e.target.value
                                  .split(',')
                                  .map((s: string) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.map((tg: string, idx: number) => (
                                <span
                                  key={idx}
                                  onClick={() => setTagFilter(tg)}
                                  className="cursor-pointer px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold"
                                >
                                  {tg}
                                </span>
                              ))}
                            </div>
                          )}
                          {lead.notes ? (
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1" title={lead.notes}>
                              <StickyNote className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{lead.notes}</span>
                            </div>
                          ) : (
                            !lead.tags?.length && <span className="text-slate-600 text-xs">-</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status & Matched Mail Rule */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${statusBadge(
                            lead.status || 'pending'
                          )}`}
                        >
                          {lead.status || 'pending'}
                        </span>
                        {matchedRule && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={`Mail Rule: ${matchedRule.name}`}>
                            ✉️ {matchedRule.language?.toUpperCase()} • {matchedRule.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1">
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-rose-400 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePreviewEmail(lead)}
                            className="text-slate-500 hover:text-indigo-400 p-1"
                            title="Preview personalized email for this lead"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(lead.id);
                              setEditData({ ...lead });
                            }}
                            className="text-slate-500 hover:text-cyan-400 p-1"
                            title="Edit lead"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {lead.status !== 'recruited' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateLeadStatus(lead.id, 'recruited')}
                              className="text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-bold border border-emerald-500/30 px-2 py-0.5 rounded transition-colors"
                            >
                              ✓ Recruit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateLeadStatus(lead.id, 'pending')}
                              className="text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-700 px-2 py-0.5 rounded"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-900 px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-semibold outline-none"
            >
              <option value={50}>50 (Batch Size)</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
            <span>
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> (
              {filteredLeads.length.toLocaleString()} leads)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Selected 50-Mail Batch Queue Review Modal */}
      {showQueueModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onKeyDown={e => {
            if (e.key === 'Escape') setShowQueueModal(false);
          }}
          tabIndex={-1}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  Selected Mail Queue ({selectedLeadsList.length} Recipients)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review, preview, or remove individual stores before dispatching your batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 px-5">
              {selectedLeadsList.map((l, idx) => {
                const rule = selectedOverrideRule || matchClientMailRule(l, mailRules);
                return (
                  <div key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate">
                        {idx + 1}. {l.companyName || 'Partner'}{' '}
                        <span className="text-slate-400 font-normal font-mono">({l.email})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>
                          {getCountryFlag(l.country)} {[l.city, l.state, l.country].filter(Boolean).join(', ') || 'Unassigned'}
                        </span>
                        {rule && (
                          <span className="text-indigo-300">
                            • Rule: {rule.name} ({rule.language?.toUpperCase()})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewEmail(l)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelect(l.id)}
                        className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setShowQueueModal(false);
                }}
                className="px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                Clear Entire Queue
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                >
                  Keep Organizing
                </button>
                <button
                  type="button"
                  disabled={sending || selectedLeadsList.length === 0}
                  onClick={() => executeBatchSend('selected')}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black shadow-lg disabled:opacity-50"
                >
                  {sending ? 'Dispatching…' : `🚀 Dispatch ${selectedLeadsList.length} Mails Now`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Lead Manually Modal */}
      {isManualAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onKeyDown={e => {
            if (e.key === 'Escape') setIsManualAddModalOpen(false);
          }}
          tabIndex={-1}
        >
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Add B2B Lead to CRM</h2>
              <button
                type="button"
                onClick={() => setIsManualAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={manualLead.businessName}
                    onChange={e => setManualLead({ ...manualLead, businessName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={manualLead.email}
                    onChange={e => setManualLead({ ...manualLead, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={manualLead.country}
                    onChange={e => setManualLead({ ...manualLead, country: e.target.value })}
                    placeholder="Sweden"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={manualLead.state}
                    onChange={e => setManualLead({ ...manualLead, state: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={manualLead.city}
                    onChange={e => setManualLead({ ...manualLead, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Segment</label>
                  <select
                    value={manualLead.segment}
                    onChange={e => setManualLead({ ...manualLead, segment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  >
                    <option value="TCG">TCG</option>
                    <option value="Sports">Sports</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Website</label>
                  <input
                    type="text"
                    value={manualLead.website}
                    onChange={e => setManualLead({ ...manualLead, website: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={manualLead.phone}
                    onChange={e => setManualLead({ ...manualLead, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="VIP, LGS, Priority"
                    value={manualLead.tags}
                    onChange={e => setManualLead({ ...manualLead, tags: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Instagram / Social URL</label>
                  <input
                    type="text"
                    value={manualLead.instagram}
                    onChange={e => setManualLead({ ...manualLead, instagram: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">CRM Notes</label>
                <textarea
                  rows={2}
                  value={manualLead.notes}
                  onChange={e => setManualLead({ ...manualLead, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50"
                >
                  {isSubmittingManual ? 'Adding…' : 'Save Lead to CRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. CSV Import Summary Modal */}
      {importSummary?.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onKeyDown={e => {
            if (e.key === 'Escape') setImportSummary(null);
          }}
          tabIndex={-1}
        >
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  CRM Import Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Source: <span className="text-slate-300 font-mono">{importSummary.source}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-400">Total Rows</div>
                <div className="text-2xl font-black text-white mt-1 tabular-nums">{importSummary.total.toLocaleString()}</div>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 text-center">
                <div className="text-[11px] font-semibold uppercase text-emerald-400">Added</div>
                <div className="text-2xl font-black text-emerald-300 mt-1 tabular-nums">+{importSummary.added.toLocaleString()}</div>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-center">
                <div className="text-[11px] font-semibold uppercase text-amber-400">Dupes Skipped</div>
                <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums">{importSummary.duplicates.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setImportSummary(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
