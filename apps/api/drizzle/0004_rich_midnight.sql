CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" text NOT NULL,
	"browser_binding_hash" text NOT NULL,
	"code_verifier_encrypted" text NOT NULL,
	"nonce_encrypted" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_states_expiry_after_creation" CHECK ("oauth_states"."expires_at" > "oauth_states"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_states_state_hash_unique" ON "oauth_states" USING btree ("state_hash");--> statement-breakpoint
CREATE INDEX "oauth_states_expiry_idx" ON "oauth_states" USING btree ("expires_at");