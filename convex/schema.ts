import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Patients table
  patients: defineTable({
    patientId: v.string(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient_id", ["patientId"])
    .index("by_name", ["lastName", "firstName"]),

  // Sessions/Visits table
  sessions: defineTable({
    sessionId: v.string(),
    patientId: v.string(),
    doctorName: v.optional(v.string()),
    visitDate: v.number(),
    chiefComplaint: v.optional(v.string()),
    imageAnalyzed: v.boolean(),
    segmentationPrompt: v.optional(v.string()),
    segmentationResult: v.optional(v.string()),
    segmentationConfidence: v.optional(v.number()),
    status: v.union(v.literal("ongoing"), v.literal("completed"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_patient", ["patientId"])
    .index("by_date", ["visitDate"]),

  // Chat messages during sessions
  messages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    hasAudio: v.boolean(),
  }).index("by_session", ["sessionId"]),

  // Medical images
  images: defineTable({
    imageId: v.string(),
    sessionId: v.string(),
    patientId: v.string(),
    imageType: v.union(v.literal("xray"), v.literal("ct"), v.literal("mri"), v.literal("ultrasound"), v.literal("other")),
    bodyPart: v.optional(v.string()),
    findings: v.optional(v.string()),
    confidence: v.optional(v.number()),
    uploadedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_patient", ["patientId"]),

  // Visit summaries (doctor's notes at the end)
  summaries: defineTable({
    summaryId: v.string(),
    sessionId: v.string(),
    patientId: v.string(),
    diagnosis: v.string(),
    findings: v.string(),
    recommendations: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    doctorNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_patient", ["patientId"]),

  // Medications/Prescriptions
  medications: defineTable({
    medicationId: v.string(),
    sessionId: v.string(),
    patientId: v.string(),
    drugName: v.string(),
    dosage: v.string(),
    frequency: v.string(), // e.g., "twice daily", "every 8 hours"
    duration: v.string(), // e.g., "7 days", "2 weeks"
    instructions: v.optional(v.string()), // e.g., "take with food"
    prescribedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_patient", ["patientId"]),

  // Analysis logs
  analysisLogs: defineTable({
    sessionId: v.string(),
    patientId: v.optional(v.string()),
    timestamp: v.number(),
    prompt: v.string(),
    confidence: v.number(),
    description: v.string(),
  }).index("by_session", ["sessionId"]),
});
