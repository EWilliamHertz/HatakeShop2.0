import { relations, sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, numeric, boolean, customType, index } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return '[' + value.join(',') + ']';
  },
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  password: text('password'),
  displayName: text('display_name'),
  role: text('role', { enum: ['buyer', 'seller', 'both', 'admin'] }).default('buyer'),
  companyName: text('company_name'),
  vatNumber: text('vat_number'),
  country: text('country'),
  verificationStatus: text('verification_status', { enum: ['pending', 'verified', 'rejected'] }).default('pending'),
  autoTranslate: boolean('auto_translate').default(false),
  preferredLanguage: text('preferred_language').default('English'),
  shippingAddress: text('shipping_address'),
  shippingCity: text('shipping_city'),
  shippingZip: text('shipping_zip'),
  stripeAccountId: text('stripe_account_id'),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false),
  inviteCode: text('invite_code'),
  teamOwnerId: integer('team_owner_id'),
  teamRole: text('team_role', { enum: ['owner', 'sales_rep', 'catalog_manager'] }).default('owner'),
  storeSlug: text('store_slug'),
  storeBannerUrl: text('store_banner_url'),
  storePolicies: text('store_policies'),
  referredById: integer('referred_by_id'),
  referralCode: text('referral_code'),
  kybDocuments: jsonb('kyb_documents').default(sql`'[]'::jsonb`),
  supplierTier: text('supplier_tier', { enum: ['none', 'Verified Supplier', 'Gold Vendor', 'Top Exporter'] }).default('none'),
  kybAutoVerified: boolean('kyb_auto_verified').default(false),
  orgNumber: text('org_number'),
  website: text('website'),
  aboutUs: text('about_us'),
  socialLinks: jsonb('social_links').default(sql`'[]'::jsonb`),
  portfolio: jsonb('portfolio').default(sql`'[]'::jsonb`),
  profilePictureUrl: text('profile_picture_url'),
  bannerUrl: text('banner_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: integer('parent_id'), // Self-referential logic
  sortOrder: integer('sort_order').default(0),
  isVisibleIfEmpty: boolean('is_visible_if_empty').default(false),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').notNull(),
  categoryId: integer('category_id'),
  title: text('title').notNull(),
  brand: text('brand'),
  description: text('description').notNull(),
  specifications: jsonb('specifications'),
  moq: integer('moq').notNull().default(1),
  stockQuantity: integer('stock_quantity').default(0),
  salesVelocity30d: integer('sales_velocity_30d').default(0),
  restockForecastDate: timestamp('restock_forecast_date'),
  unitCost: numeric('unit_cost'),
  tieredPricing: jsonb('tiered_pricing'),
  originType: text('origin_type').notNull(),
  leadTimeDays: integer('lead_time_days').notNull(),
  shippingOptions: jsonb('shipping_options').default(sql`'[]'::jsonb`),
  images: jsonb('images').default(sql`'[]'::jsonb`),
  
  // Graded Card Fields
  productType: text('product_type').default('sealed'), // 'sealed' | 'graded'
  gradingCompany: text('grading_company'),
  grade: text('grade'),
  certNumber: text('cert_number'),
  cardYear: text('card_year'),
  cardSet: text('card_set'),
  cardNumber: text('card_number'),
  cardVariant: text('card_variant'),
  certifications: jsonb('certifications').default(sql`'[]'::jsonb`),
  embedding: vector('embedding'),
  approvalStatus: text('approval_status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  isSponsored: boolean('is_sponsored').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  buyerId: integer('buyer_id').notNull(),
  targetProductId: integer('target_product_id'),
  targetSellerId: integer('target_seller_id'),
  quantity: integer('quantity').notNull(),
  targetBudget: numeric('target_budget'),
  currency: text('currency').default('USD'),
  shippingDestination: text('shipping_destination'),
  status: text('status', { enum: ['Draft', 'Sent', 'Pending', 'Under Negotiation', 'Accepted', 'Declined'] }).default('Draft'),
  aiNotes: text('ai_notes'),
  paymentStatus: text('payment_status', { enum: ['Unpaid', 'Pending', 'Paid', 'Escrow Funded', 'Escrow Released', 'Failed', 'Refunded'] }).default('Unpaid'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  invoiceUrl: text('invoice_url'),
  escrowReleaseStatus: text('escrow_release_status', { enum: ['not_started', 'requested', 'approved', 'disputed'] }).default('not_started'),
  isBlindDropship: boolean('is_blind_dropship').default(false),
  dropshipConsumerName: text('dropship_consumer_name'),
  dropshipConsumerAddress: text('dropship_consumer_address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const inquiryMessages = pgTable('inquiry_messages', {
  id: serial('id').primaryKey(),
  inquiryId: integer('inquiry_id').notNull(),
  senderId: integer('sender_id').notNull(),
  unitPriceProposed: numeric('unit_price_proposed'),
  leadTimeProposed: integer('lead_time_proposed'),
  moqProposed: integer('moq_proposed'),
  shippingTermsProposed: text('shipping_terms_proposed'),
  attachmentUrl: text('attachment_url'),
  readReceipt: boolean('read_receipt').default(false),
  messageContent: text('message_content').notNull(),
  isOfficialQuote: boolean('is_official_quote').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});


export const marketing_logs = pgTable('marketing_logs', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').notNull(),
  dateSent: timestamp('date_sent').defaultNow(),
  messageContent: text('message_content').notNull(),
  campaignName: text('campaign_name').notNull(),
  targetSegment: text('target_segment'),
  recipientCount: integer('recipient_count').default(0),
});

export const affiliates = pgTable('affiliates', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  website: text('website'),
  status: text('status', { enum: ['Lead', 'Contacted', 'Negotiating', 'Onboarded', 'Declined'] }).default('Lead'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  inquiriesSent: many(inquiries),
  messages: many(inquiryMessages),
  reviewsWritten: many(reviews, { relationName: 'reviewsWritten' }),
  reviewsReceived: many(reviews, { relationName: 'reviewsReceived' }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inquiries: many(inquiries),
  reviews: many(reviews),
}));

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  buyer: one(users, {
    fields: [inquiries.buyerId],
    references: [users.id],
  }),
  targetSeller: one(users, {
    fields: [inquiries.targetSellerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [inquiries.targetProductId],
    references: [products.id],
  }),
  messages: many(inquiryMessages),
}));

export const inquiryMessagesRelations = relations(inquiryMessages, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [inquiryMessages.inquiryId],
    references: [inquiries.id],
  }),
  sender: one(users, {
    fields: [inquiryMessages.senderId],
    references: [users.id],
  }),
}));

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  companyName: text('company_name'),
  location: text('location'),
  segment: text('segment').default('TCG'),
  status: text('status', { enum: ['pending', 'sent', 'opened', 'clicked', 'recruited', 'failed'] }).default('pending'),
  website: text('website'),
  socialLinks: jsonb('social_links').default(sql`'[]'::jsonb`),
  inviteTokenHash: text('invite_token_hash'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  resendEmailId: text('resend_email_id'),
  dripStep: integer('drip_step').default(1),
  lastEmailedAt: timestamp('last_emailed_at'),
  referredById: integer('referred_by_id'),
  redeemedAt: timestamp('redeemed_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});


export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  reviewerId: integer('reviewer_id').notNull(),
  targetUserId: integer('target_user_id'),
  targetProductId: integer('target_product_id'),
  inquiryId: integer('inquiry_id'),
  rating: integer('rating').notNull(), // 1 to 5
  title: text('title'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: 'reviewsWritten'
  }),
  targetUser: one(users, {
    fields: [reviews.targetUserId],
    references: [users.id],
    relationName: 'reviewsReceived'
  }),
  targetProduct: one(products, {
    fields: [reviews.targetProductId],
    references: [products.id],
  }),
  inquiry: one(inquiries, {
    fields: [reviews.inquiryId],
    references: [inquiries.id],
  }),
}));

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  type: text('type', { enum: ['Bug Report', 'Feature Request', 'General Feedback'] }).notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['Pending', 'Resolved'] }).default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  buyerId: integer('buyer_id').notNull(),
  sellerId: integer('seller_id').notNull(),
  stripeSessionId: text('stripe_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  totalAmount: numeric('total_amount').notNull(),
  status: text('status', { enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'] }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price').notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: 'buyerOrders'
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
    relationName: 'sellerOrders'
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const productTranslations = pgTable('product_translations', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  targetLanguage: text('target_language').notNull(),
  translatedTitle: text('translated_title').notNull(),
  translatedDescription: text('translated_description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messageTranslations = pgTable('message_translations', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull(),
  targetLanguage: text('target_language').notNull(),
  translatedContent: text('translated_content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productTranslationsRelations = relations(productTranslations, ({ one }) => ({
  product: one(products, {
    fields: [productTranslations.productId],
    references: [products.id],
  }),
}));

export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  productId: integer('product_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));
