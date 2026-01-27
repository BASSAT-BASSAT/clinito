import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new patient (with optional doctor and clinic)
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
    notes: v.optional(v.string()),
    doctorId: v.optional(v.id("doctors")),
    clinicId: v.optional(v.id("clinics")),
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
      notes: args.notes,
      doctorId: args.doctorId,
      clinicId: args.clinicId,
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

// Get patients by doctor
export const getPatientsByDoctor = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
    return patients.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get patients by clinic
export const getPatientsByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    return patients.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Search patients by name or phone
export const searchPatients = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db.query("patients").collect();
    const term = args.searchTerm.toLowerCase().trim();
    
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = (p.phone || "").replace(/\D/g, ""); // Remove non-digits
      const searchPhone = term.replace(/\D/g, "");
      
      return (
        fullName.includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.patientId.toLowerCase().includes(term) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (searchPhone && phone.includes(searchPhone))
      );
    });
  },
});

// Search patients by phone number specifically
export const searchByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const searchPhone = args.phone.replace(/\D/g, ""); // Remove non-digits
    if (!searchPhone) return [];
    
    const patients = await ctx.db.query("patients").collect();
    return patients.filter((p) => {
      const patientPhone = (p.phone || "").replace(/\D/g, "");
      return patientPhone.includes(searchPhone);
    });
  },
});

// Search patients within a specific clinic
export const searchPatientsInClinic = query({
  args: { 
    clinicId: v.id("clinics"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    
    const term = args.searchTerm.toLowerCase().trim();
    
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = (p.phone || "").replace(/\D/g, "");
      const searchPhone = term.replace(/\D/g, "");
      
      return (
        fullName.includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.patientId.toLowerCase().includes(term) ||
        (searchPhone && phone.includes(searchPhone))
      );
    });
  },
});

// Update patient info
export const updatePatient = mutation({
  args: {
    patientId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    bloodType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    medicalHistory: v.optional(v.string()),
    notes: v.optional(v.string()),
    clinicId: v.optional(v.id("clinics")),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
    
    if (!patient) throw new Error("Patient not found");
    
    const { patientId, ...updateFields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    
    Object.entries(updateFields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value;
      }
    });
    
    await ctx.db.patch(patient._id, updates);
    return patientId;
  },
});

// Delete patient
export const deletePatient = mutation({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
    
    if (!patient) throw new Error("Patient not found");
    
    // Delete related records
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    const images = await ctx.db
      .query("images")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }
    
    const summaries = await ctx.db
      .query("summaries")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const summary of summaries) {
      await ctx.db.delete(summary._id);
    }
    
    const medications = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const med of medications) {
      await ctx.db.delete(med._id);
    }
    
    // Delete the patient
    await ctx.db.delete(patient._id);
    
    return { success: true, patientId: args.patientId };
  },
});

// Move patient to different clinic
export const movePatientToClinic = mutation({
  args: {
    patientId: v.string(),
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_patient_id", (q) => q.eq("patientId", args.patientId))
      .first();
    
    if (!patient) throw new Error("Patient not found");
    
    await ctx.db.patch(patient._id, { 
      clinicId: args.clinicId,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Get patient's full portfolio
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

// Simple addPatient for compatibility
export const addPatient = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    clinicId: v.optional(v.id("clinics")),
    doctorId: v.optional(v.id("doctors")),
  },
  handler: async (ctx, args) => {
    const nameParts = args.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    
    const id = await ctx.db.insert("patients", {
      patientId,
      firstName,
      lastName,
      dateOfBirth: "",
      gender: "other",
      phone: args.phone,
      email: args.email,
      doctorId: args.doctorId,
      clinicId: args.clinicId,
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  },
});

export const listPatients = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("patients").collect();
  },
});

// Get patient statistics
export const getPatientStats = query({
  args: { doctorId: v.optional(v.id("doctors")) },
  handler: async (ctx, args) => {
    let patients;
    if (args.doctorId) {
      patients = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
        .collect();
    } else {
      patients = await ctx.db.query("patients").collect();
    }
    
    const today = new Date();
    const thisMonth = patients.filter((p) => {
      const created = new Date(p.createdAt);
      return created.getMonth() === today.getMonth() && 
             created.getFullYear() === today.getFullYear();
    });
    
    return {
      total: patients.length,
      thisMonth: thisMonth.length,
      male: patients.filter((p) => p.gender === "male").length,
      female: patients.filter((p) => p.gender === "female").length,
    };
  },
});
