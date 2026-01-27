import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Doctors table (for authentication)
  doctors: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastLogin: v.optional(v.number()),
  })
    .index("by_email", ["email"]),

  // Clinics/Hospitals table
  clinics: defineTable({
    doctorId: v.id("doctors"),
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    type: v.union(v.literal("clinic"), v.literal("hospital"), v.literal("other")),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"]),

  // Patients table (updated with clinic and doctor reference)
  patients: defineTable({
    patientId: v.string(),
    doctorId: v.optional(v.id("doctors")),
    clinicId: v.optional(v.id("clinics")),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient_id", ["patientId"])
    .index("by_name", ["lastName", "firstName"])
    .index("by_phone", ["phone"])
    .index("by_doctor", ["doctorId"])
    .index("by_clinic", ["clinicId"]),

  // Sessions/Visits table
  sessions: defineTable({
    sessionId: v.string(),
    patientId: v.string(),
    doctorId: v.optional(v.id("doctors")),
    clinicId: v.optional(v.id("clinics")),
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
    .index("by_doctor", ["doctorId"])
    .index("by_clinic", ["clinicId"])
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
    sessionId: v.optional(v.string()),
    patientId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    imageType: v.union(v.literal("xray"), v.literal("ct"), v.literal("mri"), v.literal("ultrasound"), v.literal("photo"), v.literal("other")),
    bodyPart: v.optional(v.string()),
    description: v.optional(v.string()),
    findings: v.optional(v.string()),
    confidence: v.optional(v.number()),
    uploadedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_patient", ["patientId"]),

  // Visit summaries
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
    frequency: v.string(),
    duration: v.string(),
    instructions: v.optional(v.string()),
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

  // Communication logs (WhatsApp/Email)
  communications: defineTable({
    patientId: v.string(),
    doctorId: v.optional(v.id("doctors")),
    type: v.union(v.literal("whatsapp"), v.literal("email")),
    recipient: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
    sentAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"]),
});
