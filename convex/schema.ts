import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.optional(v.string()),
    createdAt: v.number(),
    isActive: v.boolean(),
  }),
  participants: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    joinedAt: v.number(),
  }).index("by_room", ["roomId"]),
});
