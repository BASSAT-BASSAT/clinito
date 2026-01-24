import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a medication/prescription
export const addMedication = mutation({
  args: {
    sessionId: v.string(),
    patientId: v.string(),
    drugName: v.string(),
    dosage: v.string(),
    frequency: v.string(),
    duration: v.string(),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const medicationId = `MED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    await ctx.db.insert("medications", {
      medicationId,
      sessionId: args.sessionId,
      patientId: args.patientId,
      drugName: args.drugName,
      dosage: args.dosage,
      frequency: args.frequency,
      duration: args.duration,
      instructions: args.instructions,
      prescribedAt: Date.now(),
    });
    
    return medicationId;
  },
});

// Get medications for a session
export const getSessionMedications = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const medications = await ctx.db
      .query("medications")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return medications.sort((a, b) => b.prescribedAt - a.prescribedAt);
  },
});

// Get all medications for a patient
export const getPatientMedications = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const medications = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    return medications.sort((a, b) => b.prescribedAt - a.prescribedAt);
  },
});

// Delete a medication
export const deleteMedication = mutation({
  args: { medicationId: v.string() },
  handler: async (ctx, args) => {
    const medications = await ctx.db.query("medications").collect();
    const medication = medications.find((m) => m.medicationId === args.medicationId);
    
    if (!medication) throw new Error("Medication not found");
    
    await ctx.db.delete(medication._id);
  },
});

// Update medication
export const updateMedication = mutation({
  args: {
    medicationId: v.string(),
    drugName: v.optional(v.string()),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
    duration: v.optional(v.string()),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const medications = await ctx.db.query("medications").collect();
    const medication = medications.find((m) => m.medicationId === args.medicationId);
    
    if (!medication) throw new Error("Medication not found");
    
    const updates: Record<string, unknown> = {};
    if (args.drugName !== undefined) updates.drugName = args.drugName;
    if (args.dosage !== undefined) updates.dosage = args.dosage;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.instructions !== undefined) updates.instructions = args.instructions;
    
    await ctx.db.patch(medication._id, updates);
  },
});
