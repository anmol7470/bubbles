ALTER TABLE "chat_members" DROP CONSTRAINT "chat_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_creator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_members" DROP CONSTRAINT "chat_members_chat_id_user_id_pk";
--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "creator_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "id" text;
--> statement-breakpoint
UPDATE "chat_members" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "chat_members" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_members" ADD PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "left_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "chat_members_chat_id_idx" ON "chat_members" USING btree ("chat_id");
--> statement-breakpoint
CREATE INDEX "chat_members_user_id_idx" ON "chat_members" USING btree ("user_id");