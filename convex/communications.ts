import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log a communication (WhatsApp or Email)
export const logCommunication = mutation({
  args: {
    patientId: v.string(),
    doctorId: v.optional(v.id("doctors")),
    type: v.union(v.literal("whatsapp"), v.literal("email")),
    recipient: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("communications", {
      patientId: args.patientId,
      doctorId: args.doctorId,
      type: args.type,
      recipient: args.recipient,
      subject: args.subject,
      message: args.message,
      status: args.status,
      sentAt: Date.now(),
    });
  },
});

// Get communication history for a patient
export const getPatientCommunications = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return communications.sort((a, b) => b.sentAt - a.sentAt);
  },
});

// Get all communications for a doctor
export const getDoctorCommunications = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
    return communications.sort((a, b) => b.sentAt - a.sentAt);
  },
});

// Update communication status
export const updateCommunicationStatus = mutation({
  args: {
    communicationId: v.id("communications"),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.communicationId, { status: args.status });
    return { success: true };
  },
});
