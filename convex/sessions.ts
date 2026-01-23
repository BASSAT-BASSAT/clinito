import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSession = mutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    await ctx.db.insert("sessions", { sessionId, createdAt: now, lastActiveAt: now, imageAnalyzed: false, messageCount: 0 });
    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("sessions").withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId)).first();
  },
});

export const addMessage = mutation({
  args: { sessionId: v.string(), role: v.union(v.literal("user"), v.literal("assistant")), content: v.string(), hasAudio: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { sessionId: args.sessionId, role: args.role, content: args.content, timestamp: Date.now(), hasAudio: args.hasAudio });
    const session = await ctx.db.query("sessions").withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId)).first();
    if (session) await ctx.db.patch(session._id, { messageCount: session.messageCount + 1, lastActiveAt: Date.now() });
  },
});

export const getMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).collect();
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});
