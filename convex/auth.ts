import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple hash function (in production, use bcrypt on server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

// Register a new doctor
export const registerDoctor = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("doctors")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error("Email already registered");
    }

    const now = Date.now();
    const passwordHash = simpleHash(args.password);

    const doctorId = await ctx.db.insert("doctors", {
      email: args.email.toLowerCase(),
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      specialization: args.specialization,
      licenseNumber: args.licenseNumber,
      isActive: true,
      createdAt: now,
    });

    // Create a default clinic for the doctor
    await ctx.db.insert("clinics", {
      doctorId,
      name: "My Clinic",
      type: "clinic",
      isDefault: true,
      createdAt: now,
    });

    return { doctorId, email: args.email };
  },
});

// Login doctor
export const loginDoctor = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("doctors")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (!doctor) {
      throw new Error("Invalid email or password");
    }

    const passwordHash = simpleHash(args.password);
    if (doctor.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

    if (!doctor.isActive) {
      throw new Error("Account is deactivated");
    }

    // Update last login
    await ctx.db.patch(doctor._id, { lastLogin: Date.now() });

    return {
      doctorId: doctor._id,
      email: doctor.email,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialization: doctor.specialization,
    };
  },
});

// Get doctor profile
export const getDoctorProfile = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    const doctor = await ctx.db.get(args.doctorId);
    if (!doctor) return null;
    
    // Don't return password hash
    const { passwordHash, ...profile } = doctor;
    return profile;
  },
});

// Update doctor profile
export const updateDoctorProfile = mutation({
  args: {
    doctorId: v.id("doctors"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { doctorId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    });

    await ctx.db.patch(doctorId, filteredUpdates);
    return { success: true };
  },
});

// Change password
export const changePassword = mutation({
  args: {
    doctorId: v.id("doctors"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db.get(args.doctorId);
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const currentHash = simpleHash(args.currentPassword);
    if (doctor.passwordHash !== currentHash) {
      throw new Error("Current password is incorrect");
    }

    const newHash = simpleHash(args.newPassword);
    await ctx.db.patch(args.doctorId, { passwordHash: newHash });
    
    return { success: true };
  },
});
