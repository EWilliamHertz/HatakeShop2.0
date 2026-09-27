#!/usr/bin/env node
/**
 * import_foxdrop_preorders.mjs
 * Imports preorder products from FoxDropStore spreadsheet into the DB.
 * Only inserts rows with 🟡 Preorder status (skips In Stock / Sold Out).
 * Usage: node import_foxdrop_preorders.mjs [--dry-run]
 */

import pg from 'pg';
import { config } from 'dotenv';
config();

const DRY_RUN = process.argv.includes('--dry-run');
const SELLER_ID = 393; // FoxDropStore id in the users table

// ── Parse the label into an estimated timestamp ─────────────────────────────
function parsePreorderDate(label) {
  const now = new Date();
  const year = now.getFullYear();
  const monthMap = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  const lower = label.toLowerCase();

  for (const [name, idx] of Object.entries(monthMap)) {
    if (!lower.includes(name)) continue;
    const targetYear = (idx < now.getMonth()) ? year + 1 : year;
    if (lower.includes('early')) return new Date(targetYear, idx, 7);   // 7th
    if (lower.includes('mid')) return new Date(targetYear, idx, 15);    // 15th
    if (lower.includes('end') || lower.includes('late')) return new Date(targetYear, idx, 25); // 25th
    return new Date(targetYear, idx, 15); // default: mid-month
  }
  // Fallback: 30 days from now
  return new Date(Date.now() + 30 * 86_400_000);
}

// ── Detect sealed type from product name ────────────────────────────────────
function detectSealedType(name, config) {
  const n = (name + ' ' + config).toLowerCase();
  if (n.includes('booster box') || n.includes('booster')) return 'booster_box';
  if (n.includes('etb') || n.includes('elite trainer')) return 'etb';
  if (n.includes('blister')) return 'blister';
  if (n.includes('tin')) return 'tin';
  if (n.includes('deck')) return 'deck';
  if (n.includes('gift box')) return 'collection_box';
  if (n.includes('coin')) return 'accessory';
  if (n.includes('case')) return 'case';
  return 'other';
}

// ── Raw spreadsheet data (Pokemon + One Piece preorders only) ───────────────
// Source: FoxDropStore B2B Wholesale Price List spreadsheet
// Format: [name, configuration, priceEur, statusLabel]
const RAW_ROWS = [
  // 🟡 Preorder items — extracted from the spreadsheet
  ['30th Anniversary Booster Box',               '1 Case / 12 Box',     85.00,  'Preorder - End September'],
  ['CS5.5 Shadow of Glory',                      '1 Case / 20 Box',     40.00,  'Preorder - Early October'],
  ['151 V2 Hope Jumbo',                          '1 Case / 20 Box',     105.00, 'Preorder - Early October'],
  ['30th Anniversary Coin',                      '1 Case / 15 Box',     16.00,  'Preorder - Early October'],
  ['30th Anniversary Espeon & Umbreon Gift Box', '1 Case / 6 Box',      130.00, 'Preorder - Early October'],
  ['30th Anniversary Greninja Blister',          '1 Case / 12 Box',     28.00,  'Preorder - Early October'],
  ['30th Anniversary Sylveon Blister',           '1 Case / 12 Box',     28.00,  'Preorder - Early October'],
  ['30th Anniversary Umbreon Luxury Gift Box',   '1 Case / 12 Box',     30.00,  'Preorder - Early October'],
  ['30th Anniversary Sylveon Luxury Gift Box',   '1 Case / 12 Box',     30.00,  'Preorder - Early October'],
  ['Dream Painting V4 30th Anniversary',         '1 Case / 12 Box',     26.00,  'Preorder - Early October'],
  ['Mid-Autumn 2026 Gift Box',                   '1 Case / 12 Box',     26.00,  'Preorder - Mid September'],
  ['Marnie Determination Gift Box',              '1 Case / 5 Box',      94.00,  'Preorder - Mid October'],
];

// ── Parse case/box config into MOQ ──────────────────────────────────────────
function parseMoq(config) {
  const boxMatch = config.match(/(\d+)\s*Box/i);
  return boxMatch ? parseInt(boxMatch[1], 10) : 1;
}

// ── Build tiered pricing from per-box price ──────────────────────────────────
function buildTiers(pricePerBox, moq) {
  return [
    { minQty: moq,        price: pricePerBox,                             label: `${moq}+ boxes` },
    { minQty: moq * 2,    price: +(pricePerBox * 0.97).toFixed(2),        label: `${moq * 2}+ boxes (3% off)` },
    { minQty: moq * 5,    price: +(pricePerBox * 0.95).toFixed(2),        label: `${moq * 5}+ boxes (5% off)` },
  ];
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Check for duplicates by title + seller_id
    const existingRes = await pool.query(
      'SELECT title FROM products WHERE seller_id = $1 AND is_preorder = true',
      [SELLER_ID]
    );
    const existingTitles = new Set(existingRes.rows.map(r => r.title.toLowerCase().trim()));

    let inserted = 0, skipped = 0;

    for (const [name, config, priceEur, statusLabel] of RAW_ROWS) {
      const titleKey = name.toLowerCase().trim();
      if (existingTitles.has(titleKey)) {
        console.log(`  ⏭  SKIP (already exists): ${name}`);
        skipped++;
        continue;
      }

      const estimatedDate = parsePreorderDate(statusLabel);
      const moq = parseMoq(config);
      const tiers = buildTiers(priceEur, moq);
      const sealedType = detectSealedType(name, config);

      const description =
        `${config} — ${statusLabel}. ` +
        `FoxDropStore B2B wholesale. 🇮🇹 Shipped from Italy. ` +
        `0% VAT (Reverse Charge for EU B2B). Free shipping on orders over €300.`;

      const row = {
        seller_id: SELLER_ID,
        title: name,
        brand: 'Pokémon',
        description,
        moq,
        unit_cost: priceEur,
        tiered_pricing: JSON.stringify(tiers),
        origin_type: 'OEM',
        lead_time_days: 14,
        language: 'en',
        sealed_type: sealedType,
        product_type: 'sealed',
        is_preorder: true,
        preorder_estimated_date: estimatedDate.toISOString(),
        preorder_label: statusLabel.replace('Preorder - ', ''),
        approval_status: 'approved',
        images: JSON.stringify([]),
        shipping_options: JSON.stringify([
          { method: 'Standard', estimatedDays: '5-10', regions: ['EU'] },
          { method: 'Express', estimatedDays: '2-3', regions: ['EU'] },
        ]),
        stock_quantity: 0,
      };

      if (DRY_RUN) {
        console.log(`  📋 DRY-RUN: would insert → ${name} | ${statusLabel} | est. ${estimatedDate.toDateString()} | MOQ: ${moq} | €${priceEur}`);
        inserted++;
        continue;
      }

      await pool.query(`
        INSERT INTO products (
          seller_id, title, brand, description, moq, unit_cost, tiered_pricing,
          origin_type, lead_time_days, language, sealed_type, product_type,
          is_preorder, preorder_estimated_date, preorder_label,
          approval_status, images, shipping_options, stock_quantity
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        )
      `, [
        row.seller_id, row.title, row.brand, row.description, row.moq, row.unit_cost,
        row.tiered_pricing, row.origin_type, row.lead_time_days, row.language,
        row.sealed_type, row.product_type, row.is_preorder, row.preorder_estimated_date,
        row.preorder_label, row.approval_status, row.images, row.shipping_options,
        row.stock_quantity,
      ]);

      console.log(`  ✅ INSERTED: ${name} | est. ${estimatedDate.toDateString()} | MOQ: ${moq} | €${priceEur}`);
      inserted++;
    }

    console.log(`\n🏁 Done — ${inserted} inserted, ${skipped} skipped${DRY_RUN ? ' (DRY RUN — no changes written)' : ''}`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
