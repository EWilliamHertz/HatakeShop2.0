# Hatake.Shop — Improvements, Suggestions & Roadmap

> Generated: 2026-09-10 | Status: Living Document — update as features ship

---

## 🔴 Critical / Launch Blockers

### 1. Password Hashing
- **Current:** Passwords stored in plaintext in Postgres (`custom-login` route compares raw strings).
- **Fix:** Use `bcrypt` or `argon2` to hash on registration/update and `bcrypt.compare()` on login.
- **Risk:** Any database leak exposes every user's password.
DONE
### 2. Gemini API Key Missing / Embedding Errors
- **Current:** `API key should be set when using the Gemini API` warning on every startup. Embedding generation throws `403 PERMISSION_DENIED`.
- **Fix:** Either set a valid `GEMINI_API_KEY` in `.env`, or wrap all embedding calls in a graceful fallback that skips embeddings when no key is configured (currently it crashes the product edit flow).
DONE
### 3. Split `server.ts` into Modules
- **Current:** `server.ts` is **3,185 lines** — a single monolith containing auth, admin, seller, products, leads, webhooks, Stripe, Socket.IO, and AI logic.
- **Fix:** Refactor into route modules: `routes/auth.ts`, `routes/admin.ts`, `routes/products.ts`, `routes/leads.ts`, `routes/webhooks.ts`.
- **Benefit:** Faster development, easier code reviews, fewer merge conflicts between AI agents.
DONE
### 4. Environment Variable Validation
- **Current:** API keys (Resend, Stripe, Firebase, Agora, Gemini) are scattered across `.env` with no startup validation.
- **Fix:** Add a `validateEnv()` function that runs on boot and logs clear warnings for each missing key, with graceful degradation.
DONE
---

## 🟡 High Priority — Post-Launch

### 5. Real Reviews System
- **Current:** The Product Modal shows mock 4.8-star reviews.
- **Add:** A `reviews` table (`userId`, `productId`, `rating`, `comment`, `createdAt`). Let authenticated buyers leave reviews after purchasing. Display aggregate ratings on product cards.

### 6. Order / Cart / Checkout Flow
- **Current:** No cart, no checkout, no order history. Buyers can only browse and send RFQs.
- **Add:** A basic cart → checkout → order confirmation pipeline. Stripe Connect is already partially wired — complete the buyer-side payment flow and seller payout logic.

DONE

### 7. Notification System
- **Current:** No in-app notifications. Users have no idea when they receive a new RFQ, quote, or message.
- **Add:** A `notifications` table + a bell icon in the navbar with unread count. Push via Socket.IO (already present). Optional: email notifications via Resend for critical events (new order, new RFQ response).

### 8. Search & Filtering on Marketplace
- **Current:** Marketplace has a search bar but limited filtering (no price range, no origin type, no MOQ filter).
- **Add:** Sidebar filters for: Price Range, MOQ Range, Origin Type (OEM/ODM/Branded), Category, Lead Time, Verified Sellers Only. Use URL query params so filters are shareable.

### 9. Seller Onboarding Wizard
- **Current:** New sellers land on a blank dashboard with no guidance.
- **Add:** A step-by-step onboarding wizard: (1) Company Info → (2) Upload First Product → (3) Set Pricing → (4) Connect Stripe → (5) Go Live. Show a progress bar on the dashboard until all steps are complete.
DONE
### 10. Multi-Language Product Descriptions
- **Current:** `autoTranslate` flag exists on users but isn't wired to any translation service.
- **Add:** Use Google Translate API or DeepL to auto-translate product titles/descriptions when a buyer's `preferredLanguage` differs from the seller's. Cache translations in a `product_translations` table.
google cloud service api : AIzaSyDfcIm3XHVUibuIFnHBW1sERgvJwnRlq7k
DONE
---

## 🟢 Medium Priority — Growth Features

### 11. Bulk Product Upload (CSV/Excel)
- **Current:** Sellers must add products one at a time.
- **Add:** A CSV/Excel upload in Seller Dashboard that maps columns to product fields and creates products in batch. Include a preview/validation step before importing.

### 12. Supplier Verification Badges & KYB
- **Current:** `kybDocuments` array exists on users but there's no document upload UI or verification workflow.
- **Add:** Allow sellers to upload business licenses, tax certificates, and incorporation documents. Admin can review and approve/reject. Display tiered verification badges (Bronze/Silver/Gold) on storefronts and product cards.

### 13. RFQ Improvements
- **Current:** RFQ system works but quotes are basic text messages.
- **Add:** Structured quote forms (unit price, quantity, delivery date, payment terms, validity period). Allow buyers to compare quotes side-by-side. Add a "Counter-Offer" flow.

### 14. Analytics Dashboard for Sellers
- **Current:** Seller Dashboard shows basic stats.
- **Add:** Charts for: Views over time, Inquiry conversion rate, Top-performing products, Revenue by month, Buyer geography heatmap. Use Recharts (already installed).

### 15. Wishlist / Save for Later
- **Current:** No way for buyers to bookmark products.
- **Add:** A heart icon on product cards that saves to a `wishlists` table. Show saved products in a "My Wishlist" page. Optional: email alert when a wishlisted product's price drops.

### 16. Company-to-Company Messaging
- **Current:** Messaging only exists within RFQ threads.
- **Add:** Direct company-to-company chat (via Socket.IO, already set up). Accessible from any company profile page with a "Message Seller" button.

### 17. SEO & Meta Tags
- **Current:** Single-page app with no SSR and no dynamic meta tags.
- **Add:** Use `react-helmet-async` to set page-specific titles, descriptions, and OpenGraph tags for: Marketplace, Product pages, Company Profiles, Storefronts. Critical for organic search traffic.

### 18. Email Templates & Branding
- **Current:** Resend outreach emails likely use a basic template.
- **Add:** Professional HTML email templates with Hatake branding for: Welcome emails, RFQ notifications, Order confirmations, Invite emails, Password reset. Store templates in `src/email-templates/`.
DONE
---

## 🔵 Nice to Have — Differentiators

### 19. AI Product Recommendations
- **Current:** Gemini embeddings are partially wired but broken due to API key issues.
- **Add:** Once embeddings work, build a "Similar Products" section on product pages and a "Recommended for You" row on the Marketplace homepage based on browsing history + embedding similarity.

### 20. Mobile Responsive Audit
- **Current:** Most pages use Tailwind responsive classes but haven't been rigorously tested on mobile.
- **Add:** Full mobile audit. Key areas: Marketplace product grid (should be 1-col on mobile), Product Modal (needs touch-friendly image swiping), Admin Dashboard tables (need horizontal scroll), RFQ chat (needs mobile-optimized layout).

### 21. Auction / Flash Deal System
- **Current:** No time-sensitive purchasing mechanism.
- **Add:** Allow sellers to create time-limited flash deals or auction-style listings. Show a countdown timer on the Marketplace. Drives urgency and repeat visits.

### 22. Affiliate Program Enhancement
- **Current:** Affiliate Dashboard exists with basic referral tracking.
- **Add:** Tiered commission rates, payout tracking, referral link generator with UTM parameters, and a public "Become an Affiliate" landing page.

### 23. API Rate Limiting & Security Hardening
- **Current:** No rate limiting on any endpoints. The webhook endpoint has no signature verification.
- **Add:** `express-rate-limit` on auth endpoints (prevent brute force), Resend webhook signature verification, CSRF protection, input sanitization with `zod` or `joi` on all POST/PATCH endpoints.

### 24. Automated Testing Suite
- **Current:** No automated tests (the Teamwork agents wrote E2E tests for the outreach engine but no broader suite).
- **Add:** Unit tests for critical business logic (pricing calculations, auth middleware), integration tests for API endpoints, and a CI pipeline that runs tests on every push.

### 25. Dark/Light Theme Toggle
- **Current:** App is dark-only.
- **Add:** A theme toggle in Settings. Some B2B buyers in corporate environments prefer light mode. Store preference in user profile.

---

## 📊 Technical Debt

| Item | Severity | Notes |
|------|----------|-------|
| Duplicate user rows (ID 1 vs ID 14 for Phoebe) | Medium | Should be merged; can cause auth confusion |
| `migrate.ts` used as temp script file | Low | Clean up; use a proper migrations folder |
| `requireAdmin` debug logging left in `server.ts` | Low | Remove `console.log("REQUIRE ADMIN CHECK:...")` |
| `mock-admin-token` hardcoded bypass in auth middleware | High | Remove before production; only for dev |
| Ernst hardcoded password bypass on line 497 | High | Remove `Yb07tw44!` check before production |
| No database migrations tool (Drizzle Kit) | Medium | Set up `drizzle-kit` for schema migrations |
| WebSocket port (24678) hardcoded, conflicts with Vite HMR | Low | Configure dynamic port or disable in production |

---

## 🚀 Launch Checklist

- [ ] Hash all passwords with bcrypt
- [ ] Remove mock-admin-token bypass
- [ ] Remove hardcoded Ernst password bypass
- [ ] Set valid GEMINI_API_KEY or disable embedding features
- [ ] Configure Stripe Connect for live payments
- [ ] Set up Resend webhook URL in Resend dashboard (point to `https://yourdomain.com/api-v2/webhooks/resend`)
- [ ] Add rate limiting to auth endpoints
- [ ] Set up a production database (not shared dev instance)
- [ ] Configure a custom domain with SSL
- [ ] Mobile responsiveness audit
- [ ] Load test with 100+ concurrent users
- [ ] Set up error monitoring (Sentry or similar)
- [ ] GDPR compliance: cookie consent, data deletion endpoint, privacy policy page
