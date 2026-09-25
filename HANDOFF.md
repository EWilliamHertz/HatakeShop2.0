# 🔐 HANDOFF — Security & Improvement Work Order
### Hatake.Shop · prepared for Antigravity · 2026-09-25

> **Context:** This is the companion to `ENHANCEMENT_GUIDE.md`. The items below are the work that
> **could not be completed in this session** — either it needs accounts/credentials/dashboards I can't
> touch, or it's a bigger refactor that should be done carefully with review.
>
> Everything in §1–§6 **has already been implemented and verified** (see §7 for the verified list).
> Start Antigravity at §A.1 and work down.

---

## ✅ Already done in this session (do NOT redo)

| Area | What shipped |
|---|---|
| Auth bypass tokens | `mock-admin-token` / `custom-token-*` gated behind `ALLOW_TEST_TOKENS=1` + non-production. Server mint now issues **real Firebase custom tokens**. |
| Hardcoded admin emails | Removed from `server.ts`, `src/middleware/roles.ts`, `src/db/users.ts`, `src/App.tsx`. DB role is the single source of truth. |
| CORS / Socket.IO | CORS locked to prod URL + localhost. Socket.IO requires a verified Firebase ID token in the handshake; `send_message`/`mark_read` resolve the **server-side** user id; relays only reach verified inquiry participants; `join_user` restricted to self. |
| HTTP hardening | `helmet`, `compression`, `express-rate-limit` (API 300/min, auth 20/15min, AI 30/min), body limit 50mb→1mb. |
| SEO | Dynamic `/robots.txt`, `/sitemap.xml` (225 URLs: products/companies/categories/static), `vercel.json` rewrites for both + `/health`. |
| Health endpoint | `/api/health` (checks DB) — point UptimeRobot/BetterStack at it. |
| Fake data | `/insights` price index now computed from real RFQ volume; UI shows "not enough data" state instead of fabricated charts. |
| DB | 11 new indexes + `pg_trgm` + trigram title index + **unique index on lower(users.email)**. Duplicate `ernst@hatake.eu` row deleted. `bootstrapDB()` fixed to upsert by **email** (was creating duplicate rows on every dev boot). |
| Latent bug fixed | Bulk-edit route referenced `products.updatedAt` — a column that **doesn't exist** — so bulk edits were failing with 500. Removed. |
| Local dev | `npm run dev:all` (API + Vite with `/api`, `/api-v2`, `/socket.io`, `/robots.txt`, `/sitemap.xml` proxies). Verified end-to-end. |
| Embeddings script | `scripts/backfill_embeddings.ts` written; **blocked: GEMINI API key returns HTTP 401** (see §A.1). |
| Deps | `puppeteer`, `multer` moved to devDependencies; added `helmet`, `express-rate-limit`, `compression`, `concurrently`. |
| Type gate | `npm run lint` (tsc) now exits clean for the first time — pre-existing errors in `products.ts` fixed. |

---

# A. CRITICAL — do these before anything else

## A.1 🔑 Rotate the Neon database password (5 min, you must do this)
The connection string with the owner password was exposed in plaintext (repo scripts + chat).
1. Neon Console → your project → **Roles & RESET PASSWORD** for `neondb_owner`.
2. Update `DATABASE_URL` in **Vercel → Settings → Environment Variables** (Production/Preview/Dev).
3. Update local `.env`.
4. Check whether the old string appears in git history: `git log -S "npg_ZFE0xarYQ5Cu" --oneline`.
   If yes and the repo is/was public, consider `git filter-repo`.

## A.2 🔑 Verify Firebase service account key is not in git history (10 min)
```bash
git log --oneline --follow -- '**/serviceAccount*' '**/firebase-adminsdk*'
git log -S "BEGIN PRIVATE KEY" --oneline | head
```
If the private key was ever committed: rotate it (Firebase Console → Service accounts → delete old key, create new), then scrub.

## A.3 🔑 Audit the users table for admin roles you didn't grant
Current state (2026-09-25):
```
phoebe@topbestpkg.com | both
stefan@hatake.eu      | admin
ernst@hatake.eu       | admin
zudran@hatake.eu      | admin
mark.lj@hotmail.com   | admin   ← confirm this is intentional
stefanborglin@gmail.com | admin ← confirm this is intentional
```
Since the hardcoded email-bypasses were removed, **DB roles are now the only admin gate** — make sure each `admin` row is a real person you trust, and demote anyone else:
```sql
UPDATE users SET role='buyer' WHERE email='...';
```

## A.4 🔑 Set the dev flag OFF in production
`ALLOW_TEST_TOKENS=1` was added to your local `.env` **for local testing only**.
- Do **NOT** add it to Vercel env vars.
- In Vercel, confirm it is absent: Settings → Environment Variables → search `ALLOW_TEST_TOKENS`.

---

# B. HIGH — this week

## B.1 Fix Gemini 401 → then run the embeddings backfill (30 min)
The backfill script is ready (`scripts/backfill_embeddings.ts`) but the key in `.env` returns
**HTTP 401 PERMISSION_DENIED** on `text-embedding-004`.
1. Google AI Studio → create a fresh key, enable "Generative Language API".
2. `.env` + Vercel: replace `GEMINI_API_KEY`.
3. Verify: `curl https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY | head`
4. Run locally: `npm run backfill:embeddings` (196 products, ~2 min with rate-limit pauses).
5. Schedule it (Vercel Cron or GitHub Action nightly) so new products get embedded:

```yaml
# .github/workflows/backfill-embeddings.yml
name: nightly-embeddings
on:
  schedule: [{ cron: '17 3 * * *' }]
  workflow_dispatch:
jobs:
  backfill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsx scripts/backfill_embeddings.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## B.2 Vercel production is serving the OLD bundle (verify after deploy)
The changes below only go live when you **commit + push + deploy**. After deploying:
```bash
curl -s https://www.hatake.shop/robots.txt | head -3      # expect "User-agent: *"
curl -s  https://www.hatake.shop/api/health               # expect {"ok":true,...}
curl -sI https://www.hatake.shop/ | grep -i x-frame       # expect SAMEORIGIN/DENY
curl -s  -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer mock-admin-token" \
  https://www.hatake.shop/api-v2/admin/products           # expect 401
```

## B.3 Add a Vercel Cron keep-alive (10 min) — optional but nice
Neon scales to zero; first hit after idle pays cold start.
`vercel.json`:
```json
"crons": [{ "path": "/api/health", "schedule": "*/10 6-20 * * *" }]
```
(Every 10 min, 06:00–20:00 UTC — covers EU + US business hours at zero cost.)

## B.4 Sentry on client + server (1 h)
`npm i @sentry/vite-plugin @sentry/react` — wrap `App` with `Sentry.init` (client) and add
`Sentry.setupExpressErrorHandler(app)` in `server.ts` (before routes). Free tier is plenty.
You already debug prod errors from static files (`prod_error.json`) — this ends that.

## B.5 Firestore rules audit (30 min)
`firestore.rules` is in the repo and `@firebase/eslint-plugin-security-rules` is in devDependencies but unused.
Run the lint, and specifically verify `uploaded_images` collection is not world-readable/writable.
Images are served through `/api/images/:id` with no auth check on GET — decide if that's acceptable (public catalog images: yes; KYB documents: absolutely not).

---

# C. MEDIUM — next 2–3 weeks

## C.1 Image pipeline → real object storage (1–2 days) — biggest perf win
Current state: product images are **base64 blobs in Firestore**, served through `/api/images/:id` via the Node function. Problems: 1 MB Firestore doc limit silently truncates big photos, every image hit burns a function invocation, no resizing/WebP.
**Recommendation: Cloudflare R2** (zero egress fees) or Vercel Blob.
- Upload endpoint → put object → store the public URL in `products.images`.
- Generate 400/800/1200px WebP variants (sharp or Vercel Image Optimization) + `srcset`.
- Keep `/api/images/:id` as a fallback redirector for legacy rows.
- Expected: product grid payload from ~MBs → ~100s of KB.

## C.2 Real migrations instead of runtime DDL (half a day)
`ensureSealedTaxonomySchema()` executes DDL from server code on requests. With concurrent
serverless invocations this can race. Move to:
```bash
npx drizzle-kit generate   # commit SQL migrations
npx drizzle-kit migrate    # run in deploy step / CI
```
Then delete the runtime DDL call from `server.ts` / `db/index.js`.

## C.3 Consolidate the two bulk-update routes (half a day)
`server.ts` has a "FORCE OVERRIDE" `/admin/products/bulk` handler registered **before** the router,
so the canonical route in `src/routes/admin.ts` is dead code. Keep the one in `admin.ts`, delete the
override from `server.ts` (both now support `originType`, so nothing else depends on the override).
Same pattern exists for `/admin/products/:id`.

## C.4 Code-split the admin bundle (2–4 h)
Main JS chunk is 4.7 MB (1.3 MB gz) — AdminDashboard alone dominates. In `src/App.tsx`:
```tsx
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard.tsx'));
// wrap in <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
```
Do the same for SellerDashboard, DatabaseViewer, Feed. Public pages stay eager.

## C.5 Move the `req.io` middleware above the routers (10 min)
In `server.ts`, `app.use((req,res,next)=>{ (req as any).io = io; next(); })` is registered
**after** all routers mount, so `(req as any).io` is undefined for router handlers that read it
(e.g. lead updated emits). Move those 6 lines directly after `const io = ...` creation.

## C.6 JSON-LD structured data (half a day)
You now have indexable URLs — add schemas to the public pages:
- `Product` on product detail (use `tieredPricing` for `offers.priceSpecification`)
- `Organization` on company profiles (`sameAs` ← `users.socialLinks`)
- `BreadcrumbList` everywhere
Use `react-helmet-async` `<script type="application/ld+json">` tags.

## C.7 Prerendering for crawlers (1–2 days)
`react-helmet-async` meta tags only apply after JS executes. For real SEO on product/category/company
pages, add bot-user-agent detection in the Express function and serve prebuilt HTML
(`prerender.io`-style middleware), or evaluate `vite-plugin-ssr`. Highest-value pages first:
`/marketplace`, category grids, `/v/:slug` storefronts.

## C.8 Zod validation on all mutating endpoints (2–3 days, spread out)
`zod` is installed. Most POST/PATCH handlers trust `req.body` directly (e.g. `originType` is now
normalized, but `title`, `moq`, `images`, `tieredPricing` etc. are not). Priority order:
1. `src/routes/seller.ts` product create/bulk/update (product data feeds the marketplace)
2. `src/routes/auth.ts` (already OK — checks email/password presence)
3. `src/routes/admin.ts` (auth-gated, lower risk)
4. `/feedback`, `/upload` (base64 size + type sniffing — enforce a real 10 MB cap and `image/*` MIME)

---

# D. LOWER PRIORITY — backlog

| Item | Notes |
|---|---|
| Replace the `authLimiter`-based custom login with Firebase email-link only | The `custom-login` route still exists for password users; fine for now, but consider deprecating DB passwords entirely → Firebase-only auth. |
| `git mv` the ~200 root scripts into `scripts/` | `fix_*.ts`, `patch_*.cjs`, `query_*.ts` etc. at repo root. Keep `server.ts`, `api/`, config at root. Add `scripts/README.md` explaining each; delete dead ones. |
| Add GitHub Actions CI | `typecheck → vite build → esbuild server` on every PR. Vercel deploys on push; a red build should block. |
| Neon branching for previews | Give Vercel preview deployments their own DB branch so preview traffic never touches prod data. |
| `/upload` size guard | Even after 1mb JSON limit: add explicit base64 length check + MIME sniffing before writing to Firestore. |
| Reviews = verified purchases only | `reviews` table exists; gate creation on `inquiries.paymentStatus IN ('Paid','Escrow Released')`. |
| VAT auto-verification (VIES) | Free EU API: validate `users.vatNumber` → auto-set `kybAutoVerified` → "VAT Verified" badge. Big trust win, low effort. |
| Escrow narrative UI | Schema already supports the full lifecycle; build the buyer-facing timeline + "Escrow Protected" ribbon. |
| Quote comparison table | Side-by-side quotes per RFQ from `inquiryMessages` (`unitPriceProposed`, `moqProposed`, `leadTimeProposed`, `shippingTermsProposed`). |
| Seller response-rate stats | Compute from `inquiryMessages` timestamps ("responds in ~4h, 93% response rate"). |
| PostHog or Plausible analytics | Funnels: visit → product view → RFQ start → RFQ sent → reply → order. |
| Audit log for admin actions | Small `admin_audit_log` table (uid, route, ts, payload hash). Cheap now, priceless after an incident. |
| CSP headers | `helmet({ contentSecurityPolicy: false })` was set because the SPA uses inline scripts/styles; tune a real CSP + nonces when convenient. |
| i18n `hreflang` | Once localized routes exist, add alternates to the sitemap. |
| Drip campaign actually sends? | The hourly drip processor in `server.ts` updates `dripStep` but I did not verify it calls `resend.emails.send`. Verify or wire it — 21 leads are waiting. |

---

# E. Verification checklist (after Antigravity finishes B/C items)

```bash
npm run lint                    # must exit 0
npm run build                   # vite + esbuild must both pass
npm run dev:all                 # API on :3000 + web on :5173
curl localhost:3000/api/health  # {"ok":true,...}
curl localhost:3000/robots.txt  # User-agent: *
curl localhost:3000/sitemap.xml # 200+ URLs
# Logged-in checks (manual, in browser at localhost:5173):
#  - Admin listings bulk edit: set Origin → EU Warehouse on FoxDropStore rows → verify column updates
#  - RFQ chat: two browsers, messages + typing indicator + read receipts work
#  - Insights page: price chart shows "not enough data" (honest empty state)
```

## Post-deploy production checks
```bash
curl -s https://www.hatake.shop/robots.txt | head -3
curl -s https://www.hatake.shop/api/health
curl -sI https://www.hatake.shop/ | grep -iE "x-frame|strict-transport"
# Search Console: submit https://www.hatake.shop/sitemap.xml
```

---

*Prepared 2026-09-25. Session work: security hardening, SEO files, health endpoint, honest insights,
DB indexes/constraints, duplicate-user fix, dev workflow. See `ENHANCEMENT_GUIDE.md` for the full
strategy context (niching, trust features, demand-gen).*
