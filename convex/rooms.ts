import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoom = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      createdAt: Date.now(),
      isActive: true,
    });
    return roomId;
  },
});

export const getRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

export const endRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    await ctx.db.patch(args.roomId, {
      isActive: false,
    });
  },
});
