CREATE TABLE "message_images" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_images" ADD CONSTRAINT "message_images_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_images_message_id_idx" ON "message_images" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "image_urls";