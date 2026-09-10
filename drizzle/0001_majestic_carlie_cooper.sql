CREATE TABLE "affiliates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"website" text,
	"status" text DEFAULT 'Lead',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "marketing_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"date_sent" timestamp DEFAULT now(),
	"message_content" text NOT NULL,
	"campaign_name" text NOT NULL,
	"target_segment" text,
	"recipient_count" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_visible_if_empty" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD COLUMN "moq_proposed" integer;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD COLUMN "shipping_terms_proposed" text;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD COLUMN "read_receipt" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sales_velocity_30d" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "restock_forecast_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'sealed';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "grading_company" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cert_number" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "card_year" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "card_set" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "card_number" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "card_variant" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "certifications" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shipping_city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shipping_zip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "supplier_tier" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyb_auto_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "org_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "about_us" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "portfolio" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banner_url" text;