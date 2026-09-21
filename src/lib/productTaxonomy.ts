/**
 * Shared taxonomy for sealed TCG products.
 * Used by the API (filtering + classification), the seller/admin forms,
 * the marketplace filters, and the DB backfill script.
 */

export const PRODUCT_LANGUAGES = [
  { value: 'en',      label: 'English',                         short: 'EN',  flag: '🇺🇸' },
  { value: 'ja',      label: 'Japanese',                        short: 'JP',  flag: '🇯🇵' },
  { value: 'zh-Hant', label: 'Traditional Chinese (Cantonese)', short: '繁中', flag: '🇭🇰' },
  { value: 'zh-Hans', label: 'Simplified Chinese (Mandarin)',   short: '简中', flag: '🇨🇳' },
  { value: 'ko',      label: 'Korean',                          short: 'KR',  flag: '🇰🇷' },
  { value: 'other',   label: 'Other / Multi-language',          short: 'Other', flag: '🌐' },
] as const;

export type ProductLanguage = typeof PRODUCT_LANGUAGES[number]['value'];

export const SEALED_TYPES = [
  { value: 'booster_box',        label: 'Booster Boxes',          group: 'Boxes' },
  { value: 'booster_bundle',     label: 'Booster Bundles',        group: 'Boxes' },
  { value: 'etb',                label: 'Elite Trainer Boxes',    group: 'Boxes' },
  { value: 'collection_box',     label: 'Collection Boxes',       group: 'Boxes' },
  { value: 'premium_collection', label: 'Premium / Ultra Premium Collections', group: 'Boxes' },
  { value: 'tin',                label: 'Tins',                   group: 'Boxes' },
  { value: 'booster_pack',       label: 'Booster Packs',          group: 'Packs' },
  { value: 'blister',            label: 'Blisters',               group: 'Packs' },
  { value: 'deck',               label: 'Decks & Battle Sets',    group: 'Decks' },
  { value: 'case',               label: 'Sealed Cases',           group: 'Cases' },
  { value: 'accessory',          label: 'Accessories & Supplies', group: 'Other' },
  { value: 'other',              label: 'Other Sealed Products',  group: 'Other' },
] as const;

export type SealedType = typeof SEALED_TYPES[number]['value'];

export const languageLabel = (v?: string | null) =>
  PRODUCT_LANGUAGES.find(l => l.value === v)?.label || v || '';
export const sealedTypeLabel = (v?: string | null) =>
  SEALED_TYPES.find(s => s.value === v)?.label || v || '';

/**
 * Best-effort classifier. Looks at the title (and optionally description /
 * card_set / brand) and returns a language + sealed type. Anything ambiguous
 * returns null so we never overwrite an explicit value with a bad guess.
 */
export function classifyProduct(input: {
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  cardSet?: string | null;
}): { language: ProductLanguage | null; sealedType: SealedType | null; languageInferred: boolean } {
  const title = (input.title || '').trim();
  const text = `${title} ${input.cardSet || ''} ${input.brand || ''}`.toLowerCase();
  const full = `${text} ${(input.description || '').toLowerCase()}`;

  // ---------- Language ----------
  let language: ProductLanguage | null = null;
  const hasTrad = /繁體|繁中|繁体|廣東|粵|港版|台版|台灣|香港|hong kong|taiwan|cantonese|traditional chinese|\btc\b|\(tw\)|\(hk\)/.test(text);
  const hasSimp = /简体|简中|国行|大陆|中文版|mandarin|simplified chinese|\bsc\b|\(cn\)|\bchs\b/.test(text);
  const hasJp   = /japanese|japan|日本語|日版|日文|\bjp\b|\bjpn\b|\(jp\)|ポケモン|ポケモンカード|強化拡張パック|拡張パック/.test(text);
  const hasKo   = /korean|korea|한국어|한글|\bkr\b|\(kr\)/.test(text);
  const hasEn   = /english|\ben\b|\beng\b|\(us\)|\(uk\)|\(eu\)|international/.test(text);

  if (hasTrad) language = 'zh-Hant';
  else if (hasSimp) language = 'zh-Hans';
  else if (hasJp) language = 'ja';
  else if (hasKo) language = 'ko';
  else if (hasEn) language = 'en';
  else if (/[\u3040-\u30ff]/.test(title)) language = 'ja';          // kana in the title
  else if (/[\u4e00-\u9fff]/.test(title)) {
    // CJK ideographs but no kana: distinguish by common simplified-only chars
    language = /[国宝龙东车马时会这们个来对说为学]/.test(title) ? 'zh-Hans' : 'zh-Hant';
  }
  else if (/chinese|中文/.test(text)) language = 'zh-Hant'; // "Chinese" alone → default to Traditional (HK market)

  let languageInferred = false;

  // ---------- Sealed type ----------
  let sealedType: SealedType | null = null;
  const t = full;
  if (/\bcase\b|carton|master case|\bcs\b/.test(t) && !/display case|card case|deck case|showcase/.test(t)) sealedType = 'case';
  else if (/elite trainer|\betb\b|頂級訓練家|顶级训练家|トレーナーボックス|pokemon center etb/.test(t)) sealedType = 'etb';
  else if (/ultra.?premium|\bupc\b|premium collection|premium figure|super.?premium|premium.?box|プレミアム/.test(t)) sealedType = 'premium_collection';
  else if (/booster bundle|\bbundle\b/.test(t)) sealedType = 'booster_bundle';
  else if (/booster box|\bbb\b|display box|\bdisplay\b|\bbox of \d+|\b(36|30|24|20|18|12|10|8) ?(packs?|boosters?)\b|補充包盒|补充包盒|ボックス|\bbox\b(?!.*(collection|trainer|tin|deck))/.test(t)) sealedType = 'booster_box';
  else if (/\btin\b|tins|ミニ缶|鐵盒|铁盒/.test(t)) sealedType = 'tin';
  else if (/binder collection|collection box|special collection|pin collection|figure collection|poster collection|ex box|v box|vmax box|vstar box|\bcollection\b|illustration collection|\bgift box\b|禮盒|礼盒|コレクション/.test(t)) sealedType = 'collection_box';
  else if (/blister|checklane|3.?pack|three.?pack|sleeved booster|hanger/.test(t)) sealedType = 'blister';
  else if (/battle deck|theme deck|starter deck|league battle|build.?&.?battle|battle academy|trainer kit|starter set|\bdeck\b|デッキ|牌組|牌组|套牌/.test(t)) sealedType = 'deck';
  else if (/booster pack|\bpack\b|\bpacks\b|補充包|补充包|パック/.test(t)) sealedType = 'booster_pack';
  else if (/binder|sleeve|toploader|deck box|playmat|card holder|album|storage|protector|accessor|supplies|dice|mat\b|magnetic/.test(t)) sealedType = 'accessory';

  // Accessories (binders, sleeves…) have no print language.
  if (sealedType === 'accessory') return { language: null, sealedType, languageInferred: false };

  // Sealed TCG products with a purely Latin-script title and no explicit language
  // marker are, in practice, the English edition. Flag it as inferred so admins can review.
  if (!language && sealedType && /^[\x00-\x7F\u00C0-\u024F\s&:'’"“”().,\-\/!+#]*$/.test(title) && title.length > 0) {
    language = 'en';
    languageInferred = true;
  }

  return { language, sealedType, languageInferred };
}
