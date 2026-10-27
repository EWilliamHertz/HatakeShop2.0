export interface ParsedLeadGeo {
  country: string | null;
  state: string | null;
  city: string | null;
  location: string | null;
}

const US_STATES_MAP: Record<string, string> = {
  al: 'Alabama', alabama: 'Alabama',
  ak: 'Alaska', alaska: 'Alaska',
  az: 'Arizona', arizona: 'Arizona',
  ar: 'Arkansas', arkansas: 'Arkansas',
  ca: 'California', california: 'California',
  co: 'Colorado', colorado: 'Colorado',
  ct: 'Connecticut', connecticut: 'Connecticut',
  de: 'Delaware', delaware: 'Delaware',
  dc: 'District of Columbia', 'district of columbia': 'District of Columbia', 'washington dc': 'District of Columbia',
  fl: 'Florida', florida: 'Florida',
  ga: 'Georgia', georgia: 'Georgia',
  hi: 'Hawaii', hawaii: 'Hawaii',
  id: 'Idaho', idaho: 'Idaho',
  il: 'Illinois', illinois: 'Illinois',
  in: 'Indiana', indiana: 'Indiana',
  ia: 'Iowa', iowa: 'Iowa',
  ks: 'Kansas', kansas: 'Kansas',
  ky: 'Kentucky', kentucky: 'Kentucky',
  la: 'Louisiana', louisiana: 'Louisiana',
  me: 'Maine', maine: 'Maine',
  md: 'Maryland', maryland: 'Maryland',
  ma: 'Massachusetts', massachusetts: 'Massachusetts',
  mi: 'Michigan', michigan: 'Michigan',
  mn: 'Minnesota', minnesota: 'Minnesota',
  ms: 'Mississippi', mississippi: 'Mississippi',
  mo: 'Missouri', missouri: 'Missouri',
  mt: 'Montana', montana: 'Montana',
  ne: 'Nebraska', nebraska: 'Nebraska',
  nv: 'Nevada', nevada: 'Nevada',
  nh: 'New Hampshire', 'new hampshire': 'New Hampshire',
  nj: 'New Jersey', 'new jersey': 'New Jersey',
  nm: 'New Mexico', 'new mexico': 'New Mexico',
  ny: 'New York', 'new york': 'New York',
  nc: 'North Carolina', 'north carolina': 'North Carolina',
  nd: 'North Dakota', 'north dakota': 'North Dakota',
  oh: 'Ohio', ohio: 'Ohio',
  ok: 'Oklahoma', oklahoma: 'Oklahoma',
  or: 'Oregon', oregon: 'Oregon',
  pa: 'Pennsylvania', pennsylvania: 'Pennsylvania',
  ri: 'Rhode Island', 'rhode island': 'Rhode Island',
  sc: 'South Carolina', 'south carolina': 'South Carolina',
  sd: 'South Dakota', 'south dakota': 'South Dakota',
  tn: 'Tennessee', tennessee: 'Tennessee',
  tx: 'Texas', texas: 'Texas',
  ut: 'Utah', utah: 'Utah',
  vt: 'Vermont', vertmont: 'Vermont', vermont: 'Vermont',
  va: 'Virginia', virginia: 'Virginia',
  wa: 'Washington', washington: 'Washington',
  wv: 'West Virginia', 'west virginia': 'West Virginia',
  wi: 'Wisconsin', wisconsin: 'Wisconsin',
  wy: 'Wyoming', wyoming: 'Wyoming',
};

const GERMAN_REGIONS = new Set([
  'hamburg', 'bremen', 'berlin', 'bayern', 'bavaria', 'hessen', 'hesse',
  'sachsen', 'saxony', 'niedersachsen', 'nordrhein-westfalen', 'baden-württemberg',
  'baden-wurttemberg', 'rheinland-pfalz', 'schleswig-holstein', 'brandenburg',
  'mecklenburg-vorpommern', 'saarland', 'thüringen', 'thuringia', 'sachsen-anhalt',
]);

const SWEDISH_CITIES = new Set([
  'stockholm', 'göteborg', 'gothenburg', 'malmö', 'malmo', 'uppsala', 'västerås',
  'örebro', 'linköping', 'helsingborg', 'jönköping', 'norrköping', 'lund', 'umeå',
  'gävle', 'borås', 'södertälje', 'eskilstuna', 'halmstad', 'växjö', 'karlstad',
  'sundsvall', 'trollhättan', 'östersund', 'borlänge', 'falun', 'kalmar', 'skövde',
  'kristianstad', 'karlskrona', 'skellefteå', 'uddevalla', 'varberg', 'visby',
]);

const COUNTRY_ALIASES: Record<string, string> = {
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  'united states': 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  se: 'Sweden',
  sverige: 'Sweden',
  sweden: 'Sweden',
  de: 'Germany',
  deutschland: 'Germany',
  germany: 'Germany',
  no: 'Norway',
  norge: 'Norway',
  norway: 'Norway',
  dk: 'Denmark',
  danmark: 'Denmark',
  denmark: 'Denmark',
  fi: 'Finland',
  suomi: 'Finland',
  finland: 'Finland',
  nl: 'Netherlands',
  holland: 'Netherlands',
  netherlands: 'Netherlands',
  be: 'Belgium',
  belgium: 'Belgium',
  at: 'Austria',
  austria: 'Austria',
  ch: 'Switzerland',
  switzerland: 'Switzerland',
  pl: 'Poland',
  poland: 'Poland',
  cz: 'Czechia',
  czechia: 'Czechia',
  'czech republic': 'Czechia',
  pt: 'Portugal',
  portugal: 'Portugal',
  ie: 'Ireland',
  ireland: 'Ireland',
  fr: 'France',
  france: 'France',
  it: 'Italy',
  italia: 'Italy',
  italy: 'Italy',
  es: 'Spain',
  espana: 'Spain',
  españa: 'Spain',
  spain: 'Spain',
  ca: 'Canada',
  canada: 'Canada',
  mx: 'Mexico',
  mexico: 'Mexico',
  br: 'Brazil',
  brazil: 'Brazil',
  au: 'Australia',
  australia: 'Australia',
  nz: 'New Zealand',
  'new zealand': 'New Zealand',
  jp: 'Japan',
  japan: 'Japan',
  cn: 'China',
  prc: 'China',
  china: 'China',
  "people's republic of china": 'China',
  hk: 'Hong Kong',
  'hong kong': 'Hong Kong',
  tw: 'Taiwan',
  taiwan: 'Taiwan',
  kr: 'South Korea',
  'south korea': 'South Korea',
  korea: 'South Korea',
  sg: 'Singapore',
  singapore: 'Singapore',
  my: 'Malaysia',
  malaysia: 'Malaysia',
  th: 'Thailand',
  thailand: 'Thailand',
  vn: 'Vietnam',
  vietnam: 'Vietnam',
  ph: 'Philippines',
  philippines: 'Philippines',
  id_country: 'Indonesia',
  indonesia: 'Indonesia',
  in_country: 'India',
  india: 'India',
};

const NON_GEO_PLACEHOLDERS = new Set([
  'global', 'worldwide', 'international', 'unknown', 'n/a', 'na', 'none', 'null', '-',
]);

const EMAIL_TLD_COUNTRY: Record<string, string> = {
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  de: 'Germany',
  at: 'Austria',
  ch: 'Switzerland',
  nl: 'Netherlands',
  be: 'Belgium',
  fr: 'France',
  it: 'Italy',
  es: 'Spain',
  pt: 'Portugal',
  pl: 'Poland',
  cz: 'Czechia',
  uk: 'United Kingdom',
  ie: 'Ireland',
  ca: 'Canada',
  au: 'Australia',
  nz: 'New Zealand',
  jp: 'Japan',
  cn: 'China',
};

export function normalizeCountryName(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (NON_GEO_PLACEHOLDERS.has(lower)) return null;
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  // If a full US state name (e.g. "Hawaii", "California") was mistakenly passed as country
  if (lower.length > 2 && US_STATES_MAP[lower]) return 'United States';
  if (GERMAN_REGIONS.has(lower)) return 'Germany';
  return trimmed.replace(/\b\w/g, c => c.toUpperCase());
}

export function parseLeadGeo(input: {
  country?: string | null;
  state?: string | null;
  city?: string | null;
  location?: string | null;
  email?: string | null;
  website?: string | null;
}): ParsedLeadGeo {
  const rawCountryTrimmed = input.country ? String(input.country).trim() : '';
  const rawCountryLower = rawCountryTrimmed.toLowerCase();

  let state = input.state ? String(input.state).trim() || null : null;
  let city = input.city ? String(input.city).trim() || null : null;
  let location = input.location ? String(input.location).trim() || null : null;

  if (location && NON_GEO_PLACEHOLDERS.has(location.toLowerCase())) {
    location = null;
  }

  // Remap if input.country was actually a US state (e.g. "Hawaii") or German Bundesland
  let country: string | null = null;
  if (rawCountryTrimmed && !NON_GEO_PLACEHOLDERS.has(rawCountryLower)) {
    if (rawCountryLower.length > 2 && US_STATES_MAP[rawCountryLower]) {
      state = state || US_STATES_MAP[rawCountryLower];
      country = 'United States';
    } else if (GERMAN_REGIONS.has(rawCountryLower) && rawCountryLower !== 'de') {
      state = state || rawCountryTrimmed;
      country = 'Germany';
    } else {
      country = normalizeCountryName(rawCountryTrimmed);
    }
  }

  // If city itself was mistakenly set to a country name (e.g. "China", "Italy")
  if (city) {
    const lowerCity = city.toLowerCase();
    if (NON_GEO_PLACEHOLDERS.has(lowerCity)) {
      city = null;
    } else if (lowerCity.length > 2 && COUNTRY_ALIASES[lowerCity]) {
      country = country || COUNTRY_ALIASES[lowerCity];
      city = null;
    }
  }

  if (!city && !state && location) {
    const parts = location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      city = parts[0];
      state = parts[1];
      if (!country) country = normalizeCountryName(parts[parts.length - 1]);
    } else if (parts.length === 2) {
      city = parts[0];
      const second = parts[1];
      const lowerSecond = second.toLowerCase();
      // Full country names like "Shenzhen, China" or "Milan, Italy" vs US states like "Honolulu, Hawaii"
      if (COUNTRY_ALIASES[lowerSecond] && lowerSecond.length > 2) {
        country = country || COUNTRY_ALIASES[lowerSecond];
      } else if (GERMAN_REGIONS.has(lowerSecond)) {
        state = second;
        country = country || 'Germany';
      } else if (US_STATES_MAP[lowerSecond]) {
        state = US_STATES_MAP[lowerSecond];
        country = country || 'United States';
      } else if (COUNTRY_ALIASES[lowerSecond]) {
        country = country || COUNTRY_ALIASES[lowerSecond];
      } else {
        state = second;
      }
    } else if (parts.length === 1) {
      const single = parts[0];
      const lowerSingle = single.toLowerCase();
      if (NON_GEO_PLACEHOLDERS.has(lowerSingle)) {
        // leave null
      } else if (COUNTRY_ALIASES[lowerSingle]) {
        country = country || COUNTRY_ALIASES[lowerSingle];
      } else if (lowerSingle.length > 2 && US_STATES_MAP[lowerSingle]) {
        state = state || US_STATES_MAP[lowerSingle];
        country = country || 'United States';
      } else if (GERMAN_REGIONS.has(lowerSingle)) {
        state = state || single;
        country = country || 'Germany';
      } else {
        city = single;
      }
    }
  }

  // Normalize state and infer country from state/region
  if (state) {
    const lowerState = state.toLowerCase();
    if (GERMAN_REGIONS.has(lowerState)) {
      country = country || 'Germany';
    } else if (US_STATES_MAP[lowerState]) {
      state = US_STATES_MAP[lowerState];
      country = country || 'United States';
    }
  }

  if (!country && city) {
    const lowerCity = city.toLowerCase();
    if (SWEDISH_CITIES.has(lowerCity)) {
      country = 'Sweden';
    } else if (GERMAN_REGIONS.has(lowerCity)) {
      country = 'Germany';
    }
  }

  if (!country) {
    const domainSource = (input.email?.split('@')[1] || input.website || '').toLowerCase();
    const cleanHost = domainSource.replace(/^https?:\/\//, '').split('/')[0];
    const tld = cleanHost.split('.').pop() || '';
    if (cleanHost.endsWith('.co.uk') || cleanHost.endsWith('.org.uk')) {
      country = 'United Kingdom';
    } else if (EMAIL_TLD_COUNTRY[tld]) {
      country = EMAIL_TLD_COUNTRY[tld];
    }
  }

  const locParts = [city, state, country && country !== 'United States' ? country : null].filter(Boolean);
  if (!location && locParts.length > 0) {
    location = city && state ? `${city}, ${state}` : locParts.join(', ');
  } else if (city && state && (!location || location === city || location === state)) {
    location = `${city}, ${state}`;
  }

  return { country, state, city, location };
}
