import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  threads: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  messages: defineTable({
    threadId: v.id("threads"),
    messageId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    parts: v.array(v.any()), // kinda complex to define the type so just use any
  }),
});
