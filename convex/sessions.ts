import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new session/visit
export const createSession = mutation({
  args: {
    patientId: v.string(),
    doctorName: v.optional(v.string()),
    chiefComplaint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = `VIS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    
    await ctx.db.insert("sessions", {
      sessionId,
      patientId: args.patientId,
      doctorName: args.doctorName,
      chiefComplaint: args.chiefComplaint,
      visitDate: now,
      imageAnalyzed: false,
      status: "ongoing",
      createdAt: now,
      updatedAt: now,
    });
    
    return sessionId;
  },
});

// Get session by ID
export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

// Get sessions for a patient
export const getPatientSessions = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return sessions.sort((a, b) => b.visitDate - a.visitDate);
  },
});

// Update session with analysis results
export const updateSessionAnalysis = mutation({
  args: {
    sessionId: v.string(),
    segmentationPrompt: v.string(),
    segmentationResult: v.string(),
    segmentationConfidence: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) throw new Error("Session not found");
    
    await ctx.db.patch(session._id, {
      imageAnalyzed: true,
      segmentationPrompt: args.segmentationPrompt,
      segmentationResult: args.segmentationResult,
      segmentationConfidence: args.segmentationConfidence,
      updatedAt: Date.now(),
    });
  },
});

// Complete a session
export const completeSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) throw new Error("Session not found");
    
    await ctx.db.patch(session._id, {
      status: "completed",
      updatedAt: Date.now(),
    });
  },
});

// Add message to session
export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    hasAudio: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      hasAudio: args.hasAudio,
    });
  },
});

// Get messages for a session
export const getMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});
