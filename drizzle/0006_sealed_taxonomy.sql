ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "language" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sealed_type" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_language_idx" ON "products" ("language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_sealed_type_idx" ON "products" ("sealed_type");
