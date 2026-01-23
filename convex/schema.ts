import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    sessionId: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    imageAnalyzed: v.boolean(),
    segmentationPrompt: v.optional(v.string()),
    segmentationResult: v.optional(v.string()),
    messageCount: v.number(),
  }).index("by_session_id", ["sessionId"]),

  messages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    hasAudio: v.boolean(),
  }).index("by_session", ["sessionId"]),

  analysisLogs: defineTable({
    sessionId: v.string(),
    timestamp: v.number(),
    prompt: v.string(),
    confidence: v.number(),
    description: v.string(),
  }).index("by_session", ["sessionId"]),
});
