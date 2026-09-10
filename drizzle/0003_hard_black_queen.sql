CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "payment_status" text DEFAULT 'Unpaid';--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "invite_token_hash" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "redeemed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_onboarding_complete" boolean DEFAULT false;