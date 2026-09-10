CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"target_product_id" integer,
	"quantity" integer NOT NULL,
	"target_budget" numeric,
	"currency" text DEFAULT 'USD',
	"shipping_destination" text,
	"status" text DEFAULT 'Draft',
	"ai_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inquiry_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"unit_price_proposed" numeric,
	"lead_time_proposed" integer,
	"message_content" text NOT NULL,
	"is_official_quote" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"category_id" integer,
	"title" text NOT NULL,
	"brand" text,
	"description" text NOT NULL,
	"specifications" jsonb,
	"moq" integer DEFAULT 1 NOT NULL,
	"stock_quantity" integer DEFAULT 0,
	"unit_cost" numeric,
	"tiered_pricing" jsonb,
	"origin_type" text NOT NULL,
	"lead_time_days" integer NOT NULL,
	"shipping_options" jsonb DEFAULT '[]'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'buyer',
	"company_name" text,
	"vat_number" text,
	"country" text,
	"verification_status" text DEFAULT 'pending',
	"auto_translate" boolean DEFAULT false,
	"preferred_language" text DEFAULT 'English',
	"invite_code" text,
	"team_owner_id" integer,
	"team_role" text DEFAULT 'owner',
	"kyb_documents" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_invite_code_unique" UNIQUE("invite_code")
);
