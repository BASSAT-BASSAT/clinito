import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new clinic
export const createClinic = mutation({
  args: {
    doctorId: v.id("doctors"),
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    type: v.union(v.literal("clinic"), v.literal("hospital"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const clinicId = await ctx.db.insert("clinics", {
      doctorId: args.doctorId,
      name: args.name,
      address: args.address,
      phone: args.phone,
      type: args.type,
      isDefault: false,
      createdAt: Date.now(),
    });
    return clinicId;
  },
});

// Get all clinics for a doctor
export const getDoctorClinics = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
  },
});

// Update clinic
export const updateClinic = mutation({
  args: {
    clinicId: v.id("clinics"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    type: v.optional(v.union(v.literal("clinic"), v.literal("hospital"), v.literal("other"))),
  },
  handler: async (ctx, args) => {
    const { clinicId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    });

    await ctx.db.patch(clinicId, filteredUpdates);
    return { success: true };
  },
});

// Delete clinic
export const deleteClinic = mutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const clinic = await ctx.db.get(args.clinicId);
    if (clinic?.isDefault) {
      throw new Error("Cannot delete default clinic");
    }
    await ctx.db.delete(args.clinicId);
    return { success: true };
  },
});

// Set default clinic
export const setDefaultClinic = mutation({
  args: {
    doctorId: v.id("doctors"),
    clinicId: v.id("clinics"),
  },
  handler: async (ctx, args) => {
    // Remove default from all other clinics
    const clinics = await ctx.db
      .query("clinics")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
    
    for (const clinic of clinics) {
      if (clinic.isDefault) {
        await ctx.db.patch(clinic._id, { isDefault: false });
      }
    }

    // Set new default
    await ctx.db.patch(args.clinicId, { isDefault: true });
    return { success: true };
  },
});

// Get patients count by clinic
export const getClinicStats = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    
    return {
      totalPatients: patients.length,
    };
  },
});
