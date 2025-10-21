DROP INDEX "messages_chat_id_sent_at_idx";--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "last_read_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_members_chat_id_user_id_unique" ON "chat_members" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_sent_at_idx" ON "messages" USING btree ("chat_id","sent_at" DESC NULLS LAST,"id" DESC NULLS LAST);