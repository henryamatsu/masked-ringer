import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const participantId = await ctx.db.insert("participants", {
      roomId: args.roomId,
      name: args.name,
      joinedAt: Date.now(),
    });
    return participantId;
  },
});

export const leave = mutation({
  args: {
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.participantId);
  },
});

export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});
