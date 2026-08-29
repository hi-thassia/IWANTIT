ALTER TABLE "alerts" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "title" varchar(180);--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "event_key" varchar(500);--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "alerts" SET "title" = 'Alerta de preco', "event_key" = 'legacy:' || "id"::text WHERE "title" IS NULL OR "event_key" IS NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "event_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_event_key_unique" ON "alerts" USING btree ("event_key");
