import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a visit summary
export const createSummary = mutation({
  args: {
    sessionId: v.string(),
    patientId: v.string(),
    diagnosis: v.string(),
    findings: v.string(),
    recommendations: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    doctorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const summaryId = `SUM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    
    await ctx.db.insert("summaries", {
      summaryId,
      sessionId: args.sessionId,
      patientId: args.patientId,
      diagnosis: args.diagnosis,
      findings: args.findings,
      recommendations: args.recommendations,
      followUpDate: args.followUpDate,
      doctorNotes: args.doctorNotes,
      createdAt: now,
      updatedAt: now,
    });
    
    return summaryId;
  },
});

// Get summary for a session
export const getSessionSummary = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("summaries")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

// Get all summaries for a patient
export const getPatientSummaries = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update summary
export const updateSummary = mutation({
  args: {
    summaryId: v.string(),
    diagnosis: v.optional(v.string()),
    findings: v.optional(v.string()),
    recommendations: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    doctorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const summaries = await ctx.db.query("summaries").collect();
    const summary = summaries.find((s) => s.summaryId === args.summaryId);
    
    if (!summary) throw new Error("Summary not found");
    
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.diagnosis !== undefined) updates.diagnosis = args.diagnosis;
    if (args.findings !== undefined) updates.findings = args.findings;
    if (args.recommendations !== undefined) updates.recommendations = args.recommendations;
    if (args.followUpDate !== undefined) updates.followUpDate = args.followUpDate;
    if (args.doctorNotes !== undefined) updates.doctorNotes = args.doctorNotes;
    
    await ctx.db.patch(summary._id, updates);
  },
});
