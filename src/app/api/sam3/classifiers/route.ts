import { NextResponse } from 'next/server';

// Fallback classifiers list if server is not available
const FALLBACK_CLASSIFIERS = [
  {
    id: "biomedclip",
    name: "BiomedCLIP (General)",
    description: "Zero-shot classification for any medical image",
    labels: ["tumor", "mass", "nodule", "lesion", "cyst", "inflammation", "fracture", "normal tissue", "abnormal region"]
  },
  {
    id: "chest_xray",
    name: "Chest X-Ray",
    description: "14 pathologies: pneumonia, cardiomegaly, nodule, etc.",
    labels: ["Atelectasis", "Cardiomegaly", "Consolidation", "Edema", "Effusion", 
             "Emphysema", "Fibrosis", "Hernia", "Infiltration", "Mass", 
             "Nodule", "Pleural_Thickening", "Pneumonia", "Pneumothorax"]
  },
  {
    id: "brain_tumor",
    name: "Brain MRI Tumor",
    description: "Classify brain tumors: glioma, meningioma, pituitary",
    labels: ["glioma", "meningioma", "pituitary tumor", "no tumor"]
  },
  {
    id: "skin_lesion",
    name: "Skin Lesion",
    description: "Melanoma and skin lesion classification",
    labels: ["melanoma", "benign keratosis", "basal cell carcinoma", "nevus", "vascular lesion"]
  }
];

export async function GET() {
  try {
    // Try to get classifiers from the SAM3 server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch('http://localhost:8000/classifiers', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch {
      clearTimeout(timeoutId);
    }
    
    // Return fallback if server not available
    return NextResponse.json({ classifiers: FALLBACK_CLASSIFIERS });
    
  } catch (error) {
    console.error('Error fetching classifiers:', error);
    return NextResponse.json({ classifiers: FALLBACK_CLASSIFIERS });
  }
}
