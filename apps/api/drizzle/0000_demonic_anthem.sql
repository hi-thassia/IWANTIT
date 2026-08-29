CREATE TYPE "public"."alert_type" AS ENUM('price_target', 'price_drop', 'new_low', 'back_in_stock');--> statement-breakpoint
CREATE TYPE "public"."offer_availability" AS ENUM('available', 'unavailable', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."wish_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wish_id" uuid,
	"type" "alert_type" NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(320) NOT NULL,
	"ip" "inet" NOT NULL,
	"successful" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"price_target_alert" boolean DEFAULT true NOT NULL,
	"price_drop_alert" boolean DEFAULT true NOT NULL,
	"new_low_alert" boolean DEFAULT true NOT NULL,
	"stock_alert" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device" varchar(255),
	"ip" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_expiry_after_creation" CHECK ("sessions"."expires_at" > "sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "marketplaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplaces_name_not_blank" CHECK (length(trim("marketplaces"."name")) > 0),
	CONSTRAINT "marketplaces_slug_format" CHECK ("marketplaces"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wish_id" uuid NOT NULL,
	"marketplace_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"seller" varchar(255),
	"price" numeric(14, 2) NOT NULL,
	"shipping_price" numeric(14, 2),
	"total_price" numeric(14, 2) NOT NULL,
	"availability" "offer_availability" DEFAULT 'unknown' NOT NULL,
	"match_score" numeric(5, 2),
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_title_not_blank" CHECK (length(trim("offers"."title")) > 0),
	CONSTRAINT "offers_price_non_negative" CHECK ("offers"."price" >= 0),
	CONSTRAINT "offers_shipping_non_negative" CHECK ("offers"."shipping_price" is null or "offers"."shipping_price" >= 0),
	CONSTRAINT "offers_total_non_negative" CHECK ("offers"."total_price" >= 0),
	CONSTRAINT "offers_total_consistent" CHECK ("offers"."total_price" >= "offers"."price"),
	CONSTRAINT "offers_match_score_range" CHECK ("offers"."match_score" is null or ("offers"."match_score" >= 0 and "offers"."match_score" <= 100))
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"shipping_price" numeric(14, 2),
	"total_price" numeric(14, 2) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_history_price_non_negative" CHECK ("price_history"."price" >= 0),
	CONSTRAINT "price_history_shipping_non_negative" CHECK ("price_history"."shipping_price" is null or "price_history"."shipping_price" >= 0),
	CONSTRAINT "price_history_total_consistent" CHECK ("price_history"."total_price" >= "price_history"."price")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text,
	"google_id" varchar(255),
	"avatar_url" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"theme" "user_theme" DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_name_not_blank" CHECK (length(trim("users"."name")) > 0),
	CONSTRAINT "users_identity_present" CHECK ("users"."password_hash" is not null or "users"."google_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "wish_marketplaces" (
	"wish_id" uuid NOT NULL,
	"marketplace_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wish_marketplaces_wish_id_marketplace_id_pk" PRIMARY KEY("wish_id","marketplace_id")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(240) NOT NULL,
	"reference_url" text,
	"reference_image" text,
	"target_price" numeric(14, 2) NOT NULL,
	"initial_price" numeric(14, 2),
	"category" varchar(120) NOT NULL,
	"brand" varchar(120),
	"color" varchar(80),
	"size" varchar(80),
	"notes" text,
	"exact_match_only" boolean DEFAULT true NOT NULL,
	"status" "wish_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishes_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "wishes_name_not_blank" CHECK (length(trim("wishes"."name")) > 0),
	CONSTRAINT "wishes_category_not_blank" CHECK (length(trim("wishes"."category")) > 0),
	CONSTRAINT "wishes_target_price_positive" CHECK ("wishes"."target_price" > 0),
	CONSTRAINT "wishes_initial_price_positive" CHECK ("wishes"."initial_price" is null or "wishes"."initial_price" > 0)
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_wish_owner_fk" FOREIGN KEY ("wish_id","user_id") REFERENCES "public"."wishes"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_marketplace_id_marketplaces_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_marketplaces" ADD CONSTRAINT "wish_marketplaces_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_marketplaces" ADD CONSTRAINT "wish_marketplaces_marketplace_id_marketplaces_id_fk" FOREIGN KEY ("marketplace_id") REFERENCES "public"."marketplaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_user_read_created_idx" ON "alerts" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "alerts_wish_idx" ON "alerts" USING btree ("wish_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_created_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_created_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "sessions_active_expiry_idx" ON "sessions" USING btree ("expires_at") WHERE "sessions"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplaces_slug_unique" ON "marketplaces" USING btree (lower("slug"));--> statement-breakpoint
CREATE UNIQUE INDEX "offers_wish_marketplace_external_unique" ON "offers" USING btree ("wish_id","marketplace_id","external_id");--> statement-breakpoint
CREATE INDEX "offers_wish_total_price_idx" ON "offers" USING btree ("wish_id","total_price");--> statement-breakpoint
CREATE INDEX "offers_marketplace_checked_at_idx" ON "offers" USING btree ("marketplace_id","checked_at");--> statement-breakpoint
CREATE INDEX "price_history_offer_recorded_idx" ON "price_history" USING btree ("offer_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "price_history_offer_timestamp_unique" ON "price_history" USING btree ("offer_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_unique" ON "users" USING btree ("google_id") WHERE "users"."google_id" is not null;--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wishes_user_status_idx" ON "wishes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "wishes_user_created_at_idx" ON "wishes" USING btree ("user_id","created_at");
--> statement-breakpoint
INSERT INTO "marketplaces" ("name", "slug") VALUES
  ('Mercado Livre', 'mercado-livre'),
  ('Shopee', 'shopee'),
  ('SHEIN', 'shein')
ON CONFLICT DO NOTHING;
