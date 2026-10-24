import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface SwedishShopInput {
  name: string;
  type?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  cardTypes?: string;
  notes?: string;
}

export function findKortbutikerCsvFile(): string | null {
  const possibleDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    '/home/ewilliamhe/HatakeShop2.0'
  ];

  for (const dir of possibleDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      // Look for exact kort_butiker_sverige_komplett.csv first, then any kort_butiker_sverige*.csv
      const match = files.find(f => f.toLowerCase() === 'kort_butiker_sverige_komplett.csv')
        || files.find(f => f.toLowerCase().startsWith('kort_butiker_sverige') && f.toLowerCase().endsWith('.csv'));
      if (match) {
        return path.join(dir, match);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function parseSwedishShopsCsv(csvString: string): SwedishShopInput[] {
  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim()
  });

  const parsedShops: SwedishShopInput[] = [];

  for (const row of results.data as Record<string, any>[]) {
    // Fuzzy field matching
    const keys = Object.keys(row);
    const getVal = (candidates: string[]) => {
      const foundKey = keys.find(k => 
        candidates.some(c => k.toLowerCase().replace(/[\s_-]/g, '').includes(c.toLowerCase().replace(/[\s_-]/g, '')))
      );
      return foundKey && row[foundKey] !== undefined ? String(row[foundKey]).trim() : '';
    };

    const name = getVal(['butiksnamn', 'butik', 'store', 'namn', 'name', 'shop']);
    if (!name) continue;

    const type = getVal(['typ', 'type']);
    const city = getVal(['stad', 'city', 'orter', 'location']);
    const address = getVal(['adress', 'address', 'lokal']);
    const phone = getVal(['telefon', 'phone', 'tel', 'mobil']);
    const email = getVal(['email', 'epost', 'e-post', 'mail']);
    const website = getVal(['webbplats', 'hemsida', 'website', 'url', 'web']);
    const cardTypes = getVal(['korttyper', 'korttyp', 'cardtypes', 'cards', 'games']);
    const notes = getVal(['notes', 'anteckningar', 'info', 'beskrivning']);

    parsedShops.push({
      name,
      type: type || 'Fysisk butik',
      city: city || '',
      address: address || '',
      phone: phone || '',
      email: email || '',
      website: website || '',
      cardTypes: cardTypes || '',
      notes: notes || '',
    });
  }

  return parsedShops;
}

export async function seedSwedishShopsFromDisk(pool: any): Promise<number> {
  const filePath = findKortbutikerCsvFile();
  if (!filePath) {
    console.log('[swedishShops] No kort_butiker_sverige*.csv file found on disk to seed.');
    return 0;
  }

  console.log(`[swedishShops] Seeding shops from ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const shops = parseSwedishShopsCsv(content);

  let inserted = 0;
  for (const shop of shops) {
    try {
      await pool.query(
        `INSERT INTO "swedish_card_shops" 
          ("name", "type", "city", "address", "phone", "email", "website", "card_types", "notes", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [shop.name, shop.type, shop.city, shop.address, shop.phone, shop.email, shop.website, shop.cardTypes, shop.notes]
      );
      inserted++;
    } catch (err: any) {
      console.warn(`[swedishShops] Failed to insert ${shop.name}:`, err.message);
    }
  }

  console.log(`[swedishShops] Successfully seeded ${inserted} stores.`);
  return inserted;
}
