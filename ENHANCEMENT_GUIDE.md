# 🚀 Hatake.Shop — Enhancement Guide & Growth Roadmap

> **Scope:** International TCG B2B wholesale marketplace (hatake.shop)
> **Stack audited:** React 19 + Vite SPA · Express/Socket.IO on Vercel · Firebase Auth · Drizzle ORM · Neon Postgres · Resend · Stripe · EasyPost · Gemini AI
> **Based on:** Code review, live-site inspection, and a read-only look at your Neon DB.
> **Companion doc:** `IMPROVEMENTS.md` (older list — several items marked DONE there are covered here in more depth, and some "DONE" items are actually still broken, see §1)

---

## 0. Executive summary — the 5 things that matter most this month

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Security holes**: auth bypass tokens (`mock-admin-token`, `custom-token-*`), CORS `origin: "*"`, Socket.IO with no auth, 50 MB JSON body limit, **DB credentials committed in plain text** | Catastrophic — anyone can act as admin on your live API | Days |
| 2 | **SEO is effectively broken**: robots.txt & sitemap.xml return HTML (the SPA fallback eats them), only 2 static pages can ever be indexed | You are invisible to Google. B2B buyers search "pokemon wholesale pallet", "booster box distributor EU" — you get none of that traffic | Days |
| 3 | **Cold-start / liquidity problem**: 0 inquiries, 0 orders, 0 reviews (only 1 review total), 0 wishlists, 3 sellers — all internal | A marketplace with demand-side features but no recorded transactions reads as empty. Traffic ≠ trust | Ongoing |
| 4 | **Trust infrastructure missing**: verification is a boolean, reviews exist but aren't surfaced, no escrow narrative despite the schema supporting it | B2B buyers wire large sums; trust is THE conversion factor | 1–2 weeks |
| 5 | **Performance & product data quality**: sneaky-peek endpoint does per-category sub-queries + full table scans, images stored as base64 in Firestore, categories like Playmats/Storage/Magnetic Holders have **0 products** | Slow pages, big bundles, empty shelves | 1 week |

Below: detailed findings + concrete tips/tricks, organized by area. Every recommendation is tailored to what I actually found in your code and DB.

---

## 1. 🔴 Security — fix before anything else

I found these issues in the code that is **deployed right now** (they also match the "Technical Debt" section in your own `IMPROVEMENTS.md`, which lists them as still open):

### 1.1 Authentication bypass tokens (CRITICAL)
`src/middleware/auth.ts` lines 22–30:

```ts
if (token === 'mock-admin-token') {
  req.user = { uid: 'mock-admin-uid', email: 'ernst@hatake.eu', ... }
  return next();
}
if (token.startsWith('custom-token-')) {
  const uid = token.split('custom-token-')[1];
  req.user = { uid, ... }
  return next();
}
```

Anyone who sends `Authorization: Bearer mock-admin-token` to **any** endpoint (`/api/admin/*`, wishlist toggle, uploads, RFQs) is treated as your admin. This is trivially discoverable — the string is inside the public JS bundle (`index.js` line 4012 area shows the compiled client also contains it).

**Fix:**
- Delete both blocks from `src/middleware/auth.ts`.
- The test suite can pass a real Firebase ID token, or set an env var `ALLOW_TEST_TOKENS=1` checked only when `NODE_ENV !== 'production'`.
- Add a startup guard: `if (process.env.NODE_ENV === 'production' && (process.env.ALLOW_TEST_TOKENS || code.includes('mock-admin-token'))) throw`.

### 1.2 CORS wide open + Socket.IO unauthenticated
```ts
const io = new Server(httpServer, { cors: { origin: "*" } });
```
- **Fix:** Restrict to `https://www.hatake.shop` (+ your preview domains in dev):
```ts
const allowed = [process.env.FRONTEND_URL, 'http://localhost:5173'];
const io = new Server(httpServer, { cors: { origin: allowed, credentials: true } });
```
- **Socket.IO:** `send_message` accepts any `senderId` from the client — one user can impersonate another in an inquiry. Verify the JWT inside the `io.use()` middleware (Firebase admin `verifyIdToken`), and resolve `senderId` server-side from the authenticated uid. Also verify the sender actually belongs to the inquiry before persisting.

### 1.3 The database URL is in this conversation and in the repo
The Neon connection string with owner credentials was shared in plaintext (and appears in scripts like `test_pg.ts`, `check_db.ts` etc.). Treat it as compromised.

**Fix (order matters):**
1. **Rotate the password** in the Neon console → new `DATABASE_URL` in Vercel env vars only.
2. Move secrets out of the repo: keep `.env` out of git (add to `.gitignore` if not already), and grep the history: `git log -S "npg_" --oneline` to see how many commits carry secrets. Consider `git filter-repo` or BFG if the history is public.
3. Use Neon's **pooled connection string** (you already use the `-pooler` host) + set `max: 5` in your pg pool for serverless — Vercel functions can explode connections without it.
4. Consider a separate read-only role for public endpoints.

### 1.4 Request hardening
- `express.json({ limit: '50mb' })` — a 50 MB body is a DoS vector. Real image uploads should go to object storage, not base64 JSON. Reduce to `1mb` for JSON, and move image upload to a dedicated `multipart` route with a 10 MB cap and file-type sniffing (you already have `multer` installed but use base64 instead).
- No `helmet`, no rate limiting. Add:
  ```bash
  npm i helmet express-rate-limit
  ```
  ```ts
  app.use(helmet());
  app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: 10 })); // brute force guard
  ```
- **Firestore rules:** you have `firestore.rules` in the repo — run it through the included ESLint security plugin (`@firebase/eslint-plugin-security-rules` is in devDependencies — actually use it) and check `uploaded_images` is not publicly readable/writable.

### 1.5 Admin checks by email string
`server.ts` + `App.tsx`: `req.user.email === 'ernst@hatake.eu'` hardcodes admin. If that email ever becomes a normal user's, they're admin. Use role from DB only, with the DB as source of truth (`users.role === 'admin'`), and add a `lastRoleCheckAt` or org-membership check for team accounts.

**Trick:** add a tiny audit middleware that logs every admin route hit (`uid, route, ts`) to a `admin_audit_log` table. Cheap now, priceless after an incident.

---

## 2. 🔍 SEO & Discovery — currently your biggest growth blocker

### What I found on the live site
- `https://www.hatake.shop/robots.txt` → returns **the HTML app** (SPA fallback swallowed it). Google sees "if the page doesn't load automatically, click here to reload" as your robots file.
- Same for `sitemap.xml` and even `llms.txt`.
- Root HTML has decent title/description, but there is **no server-rendered content**, no product/company URLs reachable by a crawler, no structured data.
- You already ship `react-helmet-async` per-page — good, but Helmet only works for clients; crawlers that don't execute JS see the fallback splash.

### 2.1 Fix the fallback rewrite so real files win (1 hour)
In `vercel.json`, the catch-all `/(.*) → /index.html` runs **after** static files are checked, but **robots.txt / sitemap.xml don't exist as static files** — so they get the HTML. Two options:

**Option A (fastest):** create `public/robots.txt` and `public/sitemap.xml` as real static files — Vercel serves existing static files before rewrites apply.

**Option B (better long-term):** add explicit rewrites so the API owns them:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/api-v2/(.*)", "destination": "/api/index" },
    { "source": "/robots.txt", "destination": "/api/seo/robots" },
    { "source": "/sitemap.xml", "destination": "/api/seo/sitemap" },
    { "source": "/llms.txt", "destination": "/api/seo/llms" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
and generate the sitemap dynamically from the DB (products, categories, companies) — see next.

### 2.2 Dynamic sitemap endpoint (2 hours)
Add to a new `src/routes/seo.ts` and mount it in `server.ts`:

```ts
router.get("/seo/sitemap", (req, res) => {
  res.type("application/xml");
  // static pages
  const staticUrls = ['', '/marketplace', '/suppliers', '/market-insights'].map(p =>
    `https://www.hatake.shop${p}`);
  // products, companies, categories from DB (approved only)
  ...
  res.send(xml);
});
```
Include: all approved product detail pages, all company profiles/storefronts, all categories. `lastmod` = `products.updatedAt`. Ping Google via Search Console after deploying.

### 2.3 Prerender for crawlers (biggest SEO win)
The whole site is client-rendered. Options in ascending effort:

1. **Vercel + prerender.io-style middleware** on the Express function: when `User-Agent` is a known bot (Googlebot, Bingbot, GPTBot…), serve prebuilt HTML. Works with your existing SPA.
2. **Full SSR migration** to Next.js or Remix — big change; only do this if you're committing to SEO as a channel.
3. **Hybrid:** keep the SPA, but render your **highest-value pages statically at build time**: Home, Marketplace category pages, top company profiles (Vite can multi-page build these, or use `vite-plugin-ssr` / `vite-prerender-plugin`).

**Pragmatic tip:** For a B2B marketplace, the money keywords are long-tail: `wholesale pokemon booster boxes EU`, `graded card sleeves B2B`, `toploader pallet distributor`. Each product/category deserves an indexable page with:
- `<h1>` with product title + size/language,
- spec table (your `specifications` JSONB is perfect for this),
- seller name/country,
- JSON-LD `Product` schema with `offers` (availability, MOQ, tiered prices), `BreadcrumbList`, and `Organization`.

### 2.4 Structured data — implement these three JSON-LD blocks
- **Product** (product pages): `offers.priceSpecification` array from `tiered_pricing`, `brand`, `category`.
- **Organization** (company profiles): name, logo, country, `sameAs` (their social links from `users.socialLinks`).
- **BreadcrumbList** everywhere.

This is what gets you rich snippets and feeds Google Shopping-style knowledge panels.

### 2.5 Content marketing / programmatic SEO (the growth engine)
Tricks that work for TCG B2B specifically:
- **"Sealed product price index"**: you already have `tieredPricing` and an `insights` endpoint (though it currently fabricates a price index with `Math.random()` — more on that in §5). Make it real: publish monthly "Booster Box Price Trends EU vs US" pages. These earn backlinks from TCG communities and rank for "pokemon booster box price" queries.
- **Category landing pages** for each of your 22 categories with intro copy + product grid + FAQ schema ("What MOQ do suppliers require for toploaders?").
- **Company directory pages** are already half-built (`Storefront`, `CompanyProfile`) — make them indexable and they become supplier-discovery pages ranking for "[brand] wholesale".

### 2.6 International SEO
You're targeting international TCG wholesale. Since this is an SPA:
- Add `hreflang` alternates once you have localized routes (or at minimum set `x-default`).
- You already bundle i18next with many translation files (`translations*.json`) — expose language switcher → `?lang=` param → persist, and include the parameter in sitemap alternates.
- Use `_locale`-aware meta tags per language via Helmet.

---

## 3. 📊 Database (Neon) — findings & quick wins

Current state (queried read-only):

```
users 9 | products 196 | categories 22 | inquiries 0 | inquiry_messages 0
leads 21 | reviews 1 | wishlists 0 | feedback 0 | affiliates 0
```

- **196 products, all approved, all with images and prices** — nice baseline catalog (FoxDropStore 143, TopBestPKG 48, HatakeKB 5).
- **Zero inquiries/messages/orders** — the transactional side hasn't started. See §6 for demand-gen.
- **All 196 products have `embedding IS NULL`** — your vector search feature is completely dark. The `/sourcing/ai-match` endpoint silently returns no matches. Fix in §3.3.

### 3.1 Missing indexes (5 minutes, big wins)
Only 5 non-PK indexes exist on the whole DB. Add these:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_approval_status_idx ON products (approval_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_seller_id_idx      ON products (seller_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_category_id_idx    ON products (category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_created_at_idx     ON products (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_sponsored_idx      ON products (is_sponsored) WHERE is_sponsored;
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_store_slug_idx        ON users (store_slug) WHERE store_slug IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_role_idx              ON users (role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (inquiry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS wishlists_user_idx          ON wishlists (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_status_idx            ON leads (status);
-- Full-text search (replaces the current ilike '%q%' which cannot use indexes):
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_fts_idx ON products
  USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));
```

That last one matters: your marketplace search is `ilike '%term%'` on every request — sequential scans forever. There's a `create_indices.ts` and `create_indexes.ts` script pair in the repo — consolidate them into one and run at deploy time.

### 3.2 Full-text search over ILIKE
Beyond the index: swap the search condition to
```sql
websearch_to_tsquery('simple', $1) @@ to_tsvector('simple', title || description)
```
Optionally add `pg_trgm` for fuzzy matching:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX products_title_trgm_idx ON products USING gin (title gin_trgm_ops);
```
`pg_trgm` gives you typo-tolerant search ("toploaader") — genuinely useful when buyers paste SKU names. Neon supports both extensions.

### 3.3 Backfill embeddings (2 hours, unlocks your AI feature)
Every product has `embedding IS NULL`, so AI sourcing matches nothing. Write a one-off script:

```ts
for (const p of await db.select().from(products).where(isNull(products.embedding))) {
  const text = `${p.title} ${p.brand} ${p.description} ${p.sealedType} ${p.language}`;
  const emb = await generateEmbedding(text);
  await db.update(products).set({ embedding: emb }).where(eq(products.id, p.id));
  await new Promise(r => setTimeout(r, 200)); // rate limit
}
```
Run it via `npx tsx` with `GEMINI_API_KEY` set. Then add a cron (Vercel Cron or GitHub Action) to embed newly created products nightly so it never goes stale again.

### 3.4 Data hygiene issues found
- One seller row with empty company name (id NULL company) — clean up.
- `salesVelocity30d` and `restockForecastDate` exist but appear never to be written — either wire them (see §7.2) or drop them.
- Category tree: Playmats, Storage, Magnetic Card Holders have **0 products** but exist as top-level categories. Either hide until stocked (there's an `isVisibleIfEmpty` flag — use it) or reassign the 42 "accessories" products.
- Duplicate scripts (`create_indices.ts` vs `create_indexes.ts`, `fix-db.ts` vs `fix_db.ts`) — root directory has 200+ one-off scripts. This is technical debt that will eventually bite (someone runs the wrong script against prod). **Tip:** create a `scripts/` folder, move them all, and add a README table explaining what each does. Delete the stale ones.
- **Set up real Drizzle migrations** (`drizzle-kit generate` + `migrate` in CI) instead of the ad-hoc `ensureSealedTaxonomySchema()` DDL-at-runtime pattern. Runtime DDL from concurrent serverless instances can race.

### 3.5 Neon-specific tricks
- You're on the pooler endpoint — good. Keep `pg` Pool `max: 5`, `idleTimeoutMillis: 10_000`.
- **Neon autosuspend:** the DB scales to zero. First request after idle pays cold-start (~500ms+). Tips:
  - Set scale-to-zero **disabled** during business hours (Neon lets you pin min compute) if p95 latency matters.
  - Or add a 5-minute-interval Vercel Cron pinger to `/api/health` during EU/US daytime.
- Branch your DB per environment (Neon branching): `main` for prod, `dev` branch for testing scripts. Then those 200 scripts can be run safely.

---

## 4. ⚡ Performance & frontend

### 4.1 Image delivery — currently your biggest waste
- Product images are stored as **base64 in Firestore**, served through your API route with `Cache-Control: public, max-age=31536000` — but every upload becomes a document read + Node buffer. Firestore documents cap at 1 MB — large photos will fail silently.
- Product listing payloads include full `description`, `specifications`, `tieredPricing`, `cardYear`, `certNumber` etc. for every card in a grid.

**Fix:** move images to object storage with a CDN:
- **Cloudflare R2** (zero egress fees — best for image-heavy marketplace) or Vercel Blob.
- Keep Firestore `uploaded_images` as a fallback, but serve everything from `img.hatake.shop` or Vercel's `/blob` CDN.
- Add a sharp-based (or Vercel Image Optimization) `srcset` pipeline: 400/800/1200px WebP variants.
- **Trick:** since product photos of card supplies are very compressible, WebP at quality 75 typically cuts 196 products' images from ~50MB to ~5MB.

### 4.2 Payload trimming for list endpoints
`/marketplace/browse` selects every column of every product to return 4 previews per category. Tips:
- Create a `ProductCardDTO` — select only `id, title, images[0], priceFrom, moq, seller{companyName, country, verified}`.
- Return `images: images->0` only (Postgres `jsonb_path_query_first` or slice in JS after selecting just the jsonb).
- Compress with `compression` middleware (gzip) — check if Vercel already handles it; self-hosted portions don't.

### 4.3 Frontend bundle
- `puppeteer` is in `dependencies` — it should never be imported client-side, but it bloats installs. Move to devDependencies (or remove — is it used?). Same for `@types/multer` in dependencies.
- Code-split heavy pages: `React.lazy(() => import('./pages/AdminDashboard'))` for all non-public pages. AdminDashboard alone is huge (its compiled output dominates the bundle — see the compiled `index.js` size).
- `framer-motion` on every page adds ~30kb gz; import per-feature with `m` + `LazyMotion` to cut it.
- The splash screen has a 2s animated logo on every load — fine, but ensure the app shell renders *behind* it, not after it, so LCP isn't blocked.

### 4.4 The `/insights` endpoint fabricates data
`priceVolatility` is `100 + dayCount*5 + Math.random()*5`. If buyers see a "price index" chart, it's random noise. Either:
- Compute real data (aggregate `inquiries.quantity * targetBudget` by day — you have the query skeleton there), or
- Hide the panel until there's data.

Fake charts in B2B destroy credibility the first time a serious buyer compares two days.

### 4.5 PWA
`vite-plugin-pwa` is configured — good. Make sure:
- Precache the app shell only, not 50MB of images.
- Offline fallback page exists.
- Add `updateViaCache: 'none'` so deploys propagate.

---

## 5. 🛡 Trust & Conversion — the real B2B unlock

This is where marketplaces live or die. Your schema already has 80% of what you need; it's not surfaced.

### 5.1 Verification tiers (schema exists, UI doesn't)
`users.supplierTier: none | Verified Supplier | Gold Vendor | Top Exporter` + `kybDocuments` + `kybAutoVerified` exist. Ship the flow:
1. Seller uploads business registration + VAT certificate (`kybDocuments`).
2. Admin reviews in AdminDashboard (a "KYB queue" tab).
3. On approval: set `supplierTier`, show badge on **product cards, profile, storefronts, and in the RFQ list**.
4. `verificationStatus: verified` should gate: appearing in "Verified" filter, eligibility for escrow orders, and featured placement.

**Trick:** auto-verify EU companies via **VIES VAT validation** (free EU API). If `vatNumber` validates against VIES → `kybAutoVerified = true` → "VAT Verified" badge. Instant credibility with zero manual work for ~90% of EU sellers.

### 5.2 Reviews that actually build trust
You have 1 review in the DB. Buyers trust reviews of *transactions*, not star ratings alone:
- Only allow reviews where `inquiryId` exists and `paymentStatus IN ('Paid','Escrow Released')` — verified-purchase reviews.
- Show: review count, recency, response rate, dispute rate on company profiles.
- Import/export-style data points: **"Responds in ~4h"** (from `inquiryMessages` timestamps — you have this data!).

### 5.3 Escrow as the flagship trust feature
Your schema has a full escrow lifecycle: `paymentStatus: Escrow Funded → Escrow Released`, `escrowReleaseStatus: requested/approved/disputed`. Nothing in the UI narrates it.
- Add an "Escrow Protected" ribbon on qualifying sellers.
- Buyer journey page: "How payments work" with a diagram: Buyer pays → funds held → seller ships → buyer confirms → released.
- Even if volume is low initially, saying "Escrow available on all first orders" converts skeptical first-time buyers.

### 5.4 RFQ → quote → order funnel polish
The flow exists but has friction. Checklist:
- [ ] RFQ form: structured fields (quantity, target unit price, destination, Incoterms dropdown) — partially exists, enforce server-side with zod.
- [ ] **Quote comparison table**: side-by-side quotes per RFQ (unit price, MOQ, lead time, shipping terms — you store all of these on `inquiryMessages`).
- [ ] Auto-reminders: seller hasn't replied in 24h → email nudge (Resend is wired).
- [ ] Response-rate stats per seller ("93% response rate, ~2h") — huge conversion driver.
- [ ] RFQ templates ("Booster box pallet EU→US", "Graded card sleeves 1000pc") to reduce cold-start friction.

### 5.5 First-session experience
- The splash modal gates the entire site. For B2B, reduce to a 3-field "Instant Quote" form on the homepage: product + quantity + destination → shows matching suppliers **before** requiring signup. This is the single highest-impact conversion change: let buyers see value pre-registration (linkedin-style).
- Show real numbers when you have them: "196 listings · 3 verified suppliers · avg response 4h" — real small numbers beat fake big ones.

---

## 6. 📣 Demand generation — filling the liquidity gap

The DB shows the hard truth: **0 inquiries, 0 orders**. Products exist, but nobody has transacted. Marketplace advice: **constrain supply, concentrate demand**.

### 6.1 Concentrate on a niche wedge
"International TCG B2B" is too broad to win. Pick a wedge where you can be #1:
- **"Sealed product wholesale for EU buyers"** (your catalog is 154 sealed / 42 accessories — that's your actual inventory),
- or **"Card protection supplies (sleeves/toploaders) wholesale"** (FoxDropStore's 143 products are mostly this).
Own that niche's SEO + outreach, then expand. A focused message ("The EU's sealed-product wholesale hub") converts better than a generic one.

### 6.2 Activate the leads machine you already built
You have a whole CRM: `leads` (21 rows), drip campaigns, invite tokens, affiliate tracking. Tips:
- The drip processor only updates DB state — **it never actually sends emails** in the loop I read (it updates `dripStep` but I saw no `resend.emails.send` in the drip block). Verify and wire actual sends.
- **Segment-specific landing pages**: "Pokémon wholesale" page vs "MTG wholesale" page vs "One Piece wholesale" — each with relevant inventory + a segment-specific lead magnet ("Get the Q4 sealed price list").
- Import leads from where TCG shops hang out: TCGplayer store directories, cardshop finder lists, EU game store associations. You already have `parse_drive.ts` / `parse_youtube.cjs` patterns for scraping.
- **Trick:** the `leads.inviteTokenHash` flow is elegant — every outreach email carries a personalized invite that pre-fills company data. Lean into it: track `openedAt/clickedAt` (columns exist) and A/B subject lines per segment.

### 6.3 Supply side: make sellers successful
3 sellers is fine IF each is excellent:
- **Seller success checklist** in SellerDashboard: profile 100%, ≥5 products, tiered pricing set, shipping profile, response time <24h → "Ready for buyers" badge.
- Broadcast RFQs to matching sellers by email+dashboard (you have notifications routes).
- **Founder-mode tip:** in the first 90 days, *you* are the marketplace operations team — manually match any incoming RFQ to your own inventory and facilitate the first deals yourself. Seed the marketplace with real transactions (even internal ones) so data/reviews/stats are real, not empty.

### 6.4 Paid + partnership channels
- Google Ads on "pokemon wholesale distributor", "booster box pallet" — high intent, low competition in EU.
- Partner with TCG conventions (Spiel Essen, Lorcana challenges) — "official wholesale partner" badges + lead capture.
- Discord/Reddit presence in TCG business communities (r/PokemonWholesale type spaces) — B2B TCG is a relationship business; be useful, not spammy.

### 6.5 Analytics from day 1
- Add **PostHog** (open-source, self-hostable) or Plausible — you need funnels: visit → view product → start RFQ → send RFQ → reply → order. Without this you're guessing.
- Add a `page_views` / `product_views` table (or PostHog events) — powers "trending products" later.

---

## 7. 🤖 AI features — you have the plumbing, use it properly

Gemini is wired but underused (`/translate`, `/sourcing/ai-match` with dead embeddings). Tips:

### 7.1 Fix the foundations first
- Backfill embeddings (§3.3) — then "AI Sourcing" starts returning real matches.
- `/translate` has **no rate limit and no caching** — every call costs money and is abusable. Add per-user daily quotas and a `translations_cache` table (key = hash(text+lang)).

### 7.2 AI features with real B2B ROI (in order)
1. **AI listing generator** (seller-side): seller uploads photos → Gemini vision drafts title, description, specs, category, sealedType. Cuts listing time 10x. You have `@google/genai` vision support already.
2. **RFQ draft assistant**: buyer types "need 500 Japanese booster boxes to Germany" → structured RFQ fields auto-filled (your `/sourcing/ai-match` is 60% there — finish it).
3. **Inquiry reply suggestions** for sellers (tone: professional B2B English) — 1-tap reply.
4. **Price suggestion engine**: after 50+ inquiries, aggregate accepted-quote prices by category to suggest tiered pricing to new sellers. `salesVelocity30d` column exists — start filling it from order data.
5. **Search by card image**: buyer photographs a card → identify set/year → show matching graded/sleeve products. This is a differentiator no generic B2B platform has.

### 7.3 Guardrails
- All AI endpoints behind `requireAuth` + rate limits (the translate one is currently `requireAuth` but unthrottled — abuse = bill shock).
- Log token usage per user; cap free tier.
- Never let AI auto-approve anything financial.

---

## 8. 🧪 Quality engineering

### 8.1 Fix the broken lint/typecheck gates
- `npm run lint` is actually `tsc --noEmit` — good, but is it clean? (There's a `patch_ts_errors.cjs` in the repo — suggests it wasn't at some point.) Keep it green in CI.
- Tests exist (`tests/`, `TEST_INFRA.md`) — but are they run in CI? Add a GitHub Action: `typecheck → test → build` on every PR. Vercel deploys on push — a red build should block.

### 8.2 Monorepo hygiene
The root directory has **200+ one-off scripts** (`fix_*.ts`, `patch_*.cjs`, `query_*.ts`, `test_*.ts` that aren't tests). Tips:
- `mkdir scripts && git mv fix_*.ts scripts/` etc. Keep only `server.ts`, `api/`, `src/`, config files at root.
- Delete genuinely dead ones (git remembers history).
- Anything that mutates prod data should live in `scripts/ops/` with a banner comment `// RUNS AGAINST PROD` and require `--yes` flag.

### 8.3 Error tracking & observability
- Add **Sentry** (free tier) to both client and server — you'll catch the Firebase/Stripe integration issues you can't see now. `prod_error.json` in the repo suggests you've debugged prod errors from files.
- Structured server logs (pino) instead of `console.log` — searchable when Vercel logs roll over.
- Uptime monitoring: BetterStack/UptimeRobot pinging `/api/health` (create that endpoint — returns DB ping + version).

### 8.4 Staging environment
Vercel preview deployments exist automatically — but they share prod DB. Use Neon branching to give each preview its own DB branch: set `DATABASE_URL` per branch via Vercel env vars per git branch. This alone prevents "oops ran fix_db on prod" accidents.

---

## 9. 📋 Prioritized roadmap

### Week 1 — Security & trust basics (do not skip)
- [ ] Remove `mock-admin-token` + `custom-token-*` bypasses (§1.1)
- [ ] Rotate Neon password, scrub secrets from repo/history (§1.3)
- [ ] CORS lock-down + Socket.IO auth (§1.2)
- [ ] Add helmet + rate limits + reduce body limit (§1.4)
- [ ] robots.txt + sitemap.xml as real files (§2.1)
- [ ] Turn off/fix fake insights data (§4.4)

### Week 2–3 — SEO foundations
- [ ] Dynamic sitemap from DB (§2.2)
- [ ] Prerender/bot-render for product, category, company pages (§2.3)
- [ ] JSON-LD Product/Organization/Breadcrumb (§2.4)
- [ ] DB indexes + pg_trgm search (§3.1–3.2)
- [ ] Backfill product embeddings (§3.3)
- [ ] Image CDN migration (§4.1)

### Week 4–6 — Trust & conversion
- [ ] VAT auto-verification (VIES) + KYB queue (§5.1)
- [ ] Verified-purchase reviews (§5.2)
- [ ] Escrow narrative + status timeline UI (§5.3)
- [ ] Quote comparison table (§5.4)
- [ ] Pre-registration "Instant Quote" homepage form (§5.5)
- [ ] PostHog/plausible funnel analytics (§6.5)

### Week 7+ — Growth engine
- [ ] Niche wedge positioning + segment landing pages (§6.1, 6.2)
- [ ] AI listing generator (§7.2)
- [ ] Seller success checklist + RFQ broadcast (§6.3)
- [ ] Content: monthly price-index pages (§2.5)
- [ ] Staging DB branching + CI pipeline (§8.4)

---

## 10. Quick wins list (each ≤ 1 hour)

1. `public/robots.txt` + `public/sitemap.xml` — unblock Google (§2.1)
2. DB indexes via `CREATE INDEX CONCURRENTLY` (§3.1)
3. Move `puppeteer` to devDependencies (§4.3)
4. `React.lazy` the AdminDashboard + other admin pages (§4.3)
5. `helmet()` + rate limit middleware (§1.4)
6. Delete mock token blocks (§1.1)
7. VIES VAT auto-verify on company settings save (§5.1)
8. Backfill embeddings script + nightly cron (§3.3)
9. `compression` middleware (§4.2)
10. `CREATE EXTENSION pg_trgm` + trigram index for fuzzy search (§3.2)
11. Add `/api/health` endpoint + UptimeRobot monitor (§8.3)
12. Hide empty categories (Playmats, Storage, Magnetic Holders) via `isVisibleIfEmpty=false` (§3.4)
13. Sentry client+server (§8.3)
14. Fix `/insights` fake data (§4.4)
15. Socket.IO auth middleware (§1.2)

---

*Generated by audit on 2026-09-25. Re-run the DB health queries in §3 after each milestone to track progress.*
