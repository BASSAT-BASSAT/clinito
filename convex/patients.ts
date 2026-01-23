import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new patient
export const createPatient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    bloodType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    
    await ctx.db.insert("patients", {
      patientId,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      phone: args.phone,
      email: args.email,
      address: args.address,
      bloodType: args.bloodType,
      allergies: args.allergies,
      medicalHistory: args.medicalHistory,
      createdAt: now,
      updatedAt: now,
    });
    
    return patientId;
  },
});

// Get patient by ID
export const getPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
  },
});

// Get all patients
export const getAllPatients = query({
  args: {},
  handler: async (ctx) => {
    const patients = await ctx.db.query("patients").collect();
    return patients.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Search patients by name
export const searchPatients = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db.query("patients").collect();
    const term = args.searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.patientId.toLowerCase().includes(term)
    );
  },
});

// Update patient info
export const updatePatient = mutation({
  args: {
    patientId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    bloodType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
    
    if (!patient) throw new Error("Patient not found");
    
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.email !== undefined) updates.email = args.email;
    if (args.address !== undefined) updates.address = args.address;
    if (args.bloodType !== undefined) updates.bloodType = args.bloodType;
    if (args.allergies !== undefined) updates.allergies = args.allergies;
    if (args.medicalHistory !== undefined) updates.medicalHistory = args.medicalHistory;
    
    await ctx.db.patch(patient._id, updates);
    return args.patientId;
  },
});

// Get patient's full portfolio (all visits, images, medications)
export const getPatientPortfolio = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
    
    if (!patient) return null;
    
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    const medications = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    const images = await ctx.db
      .query("images")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    return {
      patient,
      sessions: sessions.sort((a, b) => b.visitDate - a.visitDate),
      summaries: summaries.sort((a, b) => b.createdAt - a.createdAt),
      medications: medications.sort((a, b) => b.prescribedAt - a.prescribedAt),
      images: images.sort((a, b) => b.uploadedAt - a.uploadedAt),
    };
  },
});
