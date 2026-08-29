CREATE TABLE "auth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" varchar(80) NOT NULL,
	"email" varchar(320),
	"ip" "inet",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ip" "inet" NOT NULL,
	"device" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "two_factor_challenges_attempts_range" CHECK ("two_factor_challenges"."attempts" >= 0 and "two_factor_challenges"."attempts" <= 5)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_totp_step" integer;--> statement-breakpoint
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_events_user_created_idx" ON "auth_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_events_type_created_idx" ON "auth_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "two_factor_challenges_hash_unique" ON "two_factor_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "two_factor_challenges_expiry_idx" ON "two_factor_challenges" USING btree ("expires_at");