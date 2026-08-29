ALTER TABLE "offers" ALTER COLUMN "total_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "price_history" ALTER COLUMN "total_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "wishes" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wishes" ADD COLUMN "monitoring_started_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "wishes_monitoring_due_idx" ON "wishes" USING btree ("status","last_checked_at");