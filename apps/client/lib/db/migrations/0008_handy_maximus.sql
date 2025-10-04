ALTER TABLE "chat_members" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "is_cleared" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "cleared_at" timestamp;