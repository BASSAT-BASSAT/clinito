import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for client-side uploads
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Save image metadata after upload
export const saveImage = mutation({
  args: {
    patientId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    imageType: v.union(v.literal("xray"), v.literal("ct"), v.literal("mri"), v.literal("ultrasound"), v.literal("photo"), v.literal("other")),
    sessionId: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await ctx.db.insert("images", {
      imageId,
      patientId: args.patientId,
      storageId: args.storageId,
      fileName: args.fileName,
      imageType: args.imageType,
      sessionId: args.sessionId,
      bodyPart: args.bodyPart,
      description: args.description,
      findings: undefined,
      confidence: undefined,
      uploadedAt: Date.now(),
    });
    
    return imageId;
  },
});

// Get all images for a patient
export const getPatientImages = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
    
    // Get URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return { ...image, url };
      })
    );
    
    return imagesWithUrls;
  },
});

// Get images for a session
export const getSessionImages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return { ...image, url };
      })
    );
    
    return imagesWithUrls;
  },
});

// Update image findings (after analysis)
export const updateImageFindings = mutation({
  args: {
    imageId: v.string(),
    findings: v.string(),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("imageId"), args.imageId))
      .first();
    
    if (!image) throw new Error("Image not found");
    
    await ctx.db.patch(image._id, {
      findings: args.findings,
      confidence: args.confidence,
    });
  },
});

// Delete an image
export const deleteImage = mutation({
  args: { imageId: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("imageId"), args.imageId))
      .first();
    
    if (!image) throw new Error("Image not found");
    
    // Delete from storage
    await ctx.storage.delete(image.storageId);
    
    // Delete metadata
    await ctx.db.delete(image._id);
  },
});

// Get single image by ID
export const getImage = query({
  args: { imageId: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("imageId"), args.imageId))
      .first();
    
    if (!image) return null;
    
    const url = await ctx.storage.getUrl(image.storageId);
    return { ...image, url };
  },
});
