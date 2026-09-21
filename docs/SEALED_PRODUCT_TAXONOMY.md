# Sealed product taxonomy (language + product type)

Hatake hosts sales of **sealed** Pokémon / TCG products (not single cards).
Every sealed listing now carries two extra attributes:

| Column (`products`) | Values | Meaning |
|---|---|---|
| `language` | `en`, `ja`, `zh-Hant`, `zh-Hans`, `ko`, `other` | Print language / edition on the box. `zh-Hant` = Traditional Chinese (Cantonese / HK / TW), `zh-Hans` = Simplified Chinese (Mandarin / mainland). |
| `sealed_type` | `booster_box`, `booster_bundle`, `etb`, `collection_box`, `premium_collection`, `tin`, `booster_pack`, `blister`, `deck`, `case`, `accessory`, `other` | What kind of sealed product it is. |

The single source of truth for labels/ordering is `src/lib/productTaxonomy.ts`.
It is shared by the API, the seller form, the admin dashboard and the marketplace.

---

## 1. Apply to the live database (one-time)

Nothing is deleted. The script only **adds** two nullable columns + indexes, and
fills them in for rows where they are empty.

```bash
# 1. Dry run — prints what it *would* set, writes nothing
DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npx tsx scripts/classify_sealed_products.ts

# 2. Apply
DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npx tsx scripts/classify_sealed_products.ts --apply
```

At the end the script prints:

* a **summary** per language / type,
* an **ℹ "inferred English"** list – products whose title had no language marker
  at all. Sealed TCG with a plain Latin title is almost always the English
  edition, so these are set to `en`; skim the list and fix any that are actually
  Chinese/Japanese,
* a **⚠ unresolved** list – products it refused to guess. Fix those in
  **Admin → Listings** (see below). Accessories (binders, sleeves…) intentionally
  have no language.

Re-running is safe: rows that already have a value are left alone unless you
pass `--force`.

If you prefer plain SQL for the schema part, `drizzle/0006_sealed_taxonomy.sql`
contains exactly the `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements.

## 2. Fixing / bulk-editing in the Admin dashboard

**Admin → Listings** now has:

* filters for *Language* and *Product Type*, including **"⚠ No language set"** /
  **"⚠ No type set"** so you can list exactly the unclassified rows,
* two new columns in the table showing the current values,
* **bulk edit**: select rows → *Set Language* / *Set Product Type* → *Apply Bulk Edit*.

## 3. Sellers

The "Add / Edit listing" form (step 1) has *Product Language* and *Sealed Product
Type* dropdowns. They are auto-suggested from the title when the seller leaves
the title field, and can be overridden.

## 4. Marketplace

The left sidebar was rebuilt. The old four multi-select boxes
(include/exclude countries, include/exclude regions) are gone. It now shows:

1. **Language / Edition** – checkboxes with live counts
2. **Product Type** – grouped (Boxes / Packs / Decks / Cases / Other) with counts
3. **Category** – the existing category tree (collapsed by default)
4. **Ships From** – seller countries with counts (only countries that actually have stock)
5. **Price & Quantity**

Selected filters appear as removable chips above the results, sort moved to the
toolbar, and there is real pagination. All filter state is kept in the URL
(`/marketplace?lang=ja,zh-Hant&type=booster_box&country=Japan`), so links can be
shared and the back button works.

### API

* `GET /api-v2/marketplace/facets` → `{ languages[], sealedTypes[], countries[], unclassified }` (only non-empty facets, each with `count`)
* `GET /api-v2/products?languages=ja,zh-Hant&sealedTypes=etb,booster_box&countries=Japan&sortBy=price_asc&page=2`
  (`sortBy`: `newest | price_asc | price_desc | lowest_moq`)
* Admin `PATCH /api-v2/admin/products/:id` and `PATCH /api-v2/admin/products/bulk` accept `language` and `sealedType`.
* Seller `POST/PATCH /api-v2/seller/products` accept `language` and `sealedType`.

## Database column self-healing (2026-09-21)

PR #2 added two `products` columns (`language`, `sealed_type`) via
`drizzle/0006_sealed_taxonomy.sql`. When that migration has **not** been applied
to a database yet, every query that reads `products` (marketplace, sneak-peek,
seller/admin dashboards) fails with `column "language" does not exist`, which
made the storefront show no products and no companies at all.

`src/db/index.ts` now exports `ensureSealedTaxonomySchema()`, which applies the
same **idempotent** DDL as the 0006 migration (`ADD COLUMN IF NOT EXISTS` /
`CREATE INDEX IF NOT EXISTS`). It runs automatically once per process on boot
and is awaited by the routes that touch those columns, so a deploy heals the
database on its first cold start — no manual migration step required. Running
`drizzle/0006_sealed_taxonomy.sql` manually is still fine and remains a no-op
afterwards.
