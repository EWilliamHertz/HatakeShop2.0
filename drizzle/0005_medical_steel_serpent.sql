CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" integer NOT NULL,
	"target_user_id" integer,
	"target_product_id" integer,
	"inquiry_id" integer,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "invoice_url" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "escrow_release_status" text DEFAULT 'not_started';