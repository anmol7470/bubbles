CREATE INDEX "messages_chat_id_sent_at_idx" ON "messages" USING btree ("chat_id","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");