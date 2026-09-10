ALTER TABLE "leads" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb;