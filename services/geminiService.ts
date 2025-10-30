import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CharacterProfile, SceneProfile, Bag } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY as string });

// Helper to convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
};

// Helper to convert File to GenerativePart for Gemini
const fileToGenerativePart = async (file: File) => {
  return {
    inlineData: { data: await fileToBase64(file), mimeType: file.type },
  };
};

// Generic profile extractor
const extractProfile = async <T,>(imageFile: File, prompt: string, schema: any): Promise<T> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    try {
        const jsonString = result.text.trim();
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", result.text);
        throw new Error("Could not parse AI profile response.");
    }
};

// Profile extraction functions
export const extractCharacterProfile = (imageFile: File): Promise<CharacterProfile> => {
    const prompt = 'Analyze the woman in this mirror selfie. Provide a detailed description for each field in the JSON schema. Focus on creating a reusable profile that can perfectly replicate her in another image. Descriptions should be 2-3 sentences each.';
    const schema = {
        type: Type.OBJECT,
        properties: {
            faceDescriptor: { type: Type.STRING, description: "Detailed description of her facial features, shape, and expression." },
            bodyDescriptor: { type: Type.STRING, description: "Detailed description of her body type, build, and height." },
            skinTone: { type: Type.STRING, description: "Precise description of her skin tone and undertone." },
            hairStyle: { type: Type.STRING, description: "Detailed description of her hair color, style, length, and texture." },
            accessories: { type: Type.STRING, description: "Description of any jewelry, glasses, or other accessories she is wearing." },
            nailColor: { type: Type.STRING, description: "Description of her nail color, length, and shape, if visible." },
            distinguishingFeatures: { type: Type.STRING, description: "Description of any unique features like tattoos, moles, or scars." },
        },
         required: ["faceDescriptor", "bodyDescriptor", "skinTone", "hairStyle", "accessories", "nailColor", "distinguishingFeatures"],
    };
    return extractProfile<CharacterProfile>(imageFile, prompt, schema);
};

export const extractScene1Profile = (imageFile: File): Promise<SceneProfile> => {
    const prompt = 'Analyze the background scene of this mirror selfie, ignoring the person. Provide a detailed description for each field in the JSON schema. Focus on details that would allow for a perfect replication of the scene.';
    const schema = {
        type: Type.OBJECT,
        properties: {
            location: { type: Type.STRING, description: "The type of room, e.g., 'luxury hotel bathroom'." },
            background: { type: Type.STRING, description: "Detailed description of the walls, tiles, and overall background elements." },
            lighting: { type: Type.STRING, description: "Description of the lighting source, quality, and color (e.g., 'warm directional spotlights')." },
            cameraAngle: { type: Type.STRING, description: "Description of the camera's position, angle, and framing." },
            mirror: { type: Type.STRING, description: "Detailed description of the mirror's size, shape, and frame." },
            surfaceType: { type: Type.STRING, description: "Description of the floor and countertop surfaces (e.g., 'white marble with grey veins')." },
            furniture: { type: Type.STRING, description: "Description of any visible furniture like vanities, sinks, or fixtures." },
            colorPalette: { type: Type.STRING, description: "The dominant color palette of the scene." },
            ceiling: { type: Type.STRING, description: "Description of the ceiling, including any fixtures or details." },
        },
        required: ["location", "background", "lighting", "cameraAngle", "mirror", "surfaceType", "furniture", "colorPalette", "ceiling"],
    };
    return extractProfile<SceneProfile>(imageFile, prompt, schema);
};

export const extractScene2Profile = (imageFile: File): Promise<SceneProfile> => {
    const prompt = 'Analyze the background scene of this mirror selfie, ignoring the person. Provide a detailed description for each field in the JSON schema. Focus on details that would allow for a perfect replication of the scene.';
    const schema = {
        type: Type.OBJECT,
        properties: {
            location: { type: Type.STRING, description: "The type of room, e.g., 'hotel bedroom'." },
            background: { type: Type.STRING, description: "Detailed description of the background elements like bed, windows, and curtains." },
            lighting: { type: Type.STRING, description: "Description of the lighting source, quality, and color (e.g., 'warm side lamp')." },
            cameraAngle: { type: Type.STRING, description: "Description of the camera's position, angle, and framing." },
            furniture: { type: Type.STRING, description: "Description of any visible furniture like bed, chair, or nightstand." },
            colorPalette: { type: Type.STRING, description: "The dominant color palette of the scene." },
            ceiling: { type: Type.STRING, description: "Description of the ceiling, including any fixtures or details." },
        },
        required: ["location", "background", "lighting", "cameraAngle", "furniture", "colorPalette", "ceiling"],
    };
    return extractProfile<SceneProfile>(imageFile, prompt, schema);
};

// Generate image using Gemini (for Frames 2 & 3)
const generateImageWithGemini = async (
    prompt: string,
    referenceImage?: File,
    bagImage?: File
): Promise<string> => {
    const parts: any[] = [];
    if (referenceImage) {
        parts.push(await fileToGenerativePart(referenceImage));
    }
    if (bagImage) {
        parts.push(await fileToGenerativePart(bagImage));
    }
    parts.push({ text: prompt });

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] },
    });

    let imageBytes: string | null = null;
    if (result.candidates && result.candidates.length > 0) {
        for (const part of result.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                imageBytes = part.inlineData.data;
                break;
            }
        }
    }

    if (!imageBytes) {
        throw new Error("Image generation failed with Gemini. No image data found.");
    }
    return imageBytes;
};

// Generate image using DALL-E 3 Backend for Frames 1 & 4
const generateWithDallE3 = async (
  referenceImage: File,
  bagImage: File,
  prompt: string
): Promise<string> => {
  const backendUrl = `${import.meta.env.VITE_BACKEND_URL || 'https://bagify-backend.vercel.app'}/api/imagen3/generate`;

  try {
    console.log(`🖼️ Calling DALL-E 3 backend at ${backendUrl}...`);

    const [referenceImageBase64, bagImageBase64] = await Promise.all([
      fileToBase64(referenceImage),
      fileToBase64(bagImage),
    ]);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceImageBase64,
        bagImageBase64,
        prompt,
      }),
    });

    console.log(`📡 Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response from backend.' }));
      console.error("❌ Backend responded with an error:", response.status, errorBody);

      let detailedError = errorBody.error || response.statusText;
      throw new Error(`Backend request failed (${response.status}): ${detailedError}`);
    }

    const result = await response.json();

    if (!result.success || !result.image) {
      console.error("❌ Backend response was not successful:", result);
      throw new Error(result.error || "Backend did not return a valid image.");
    }
    
    console.log("✅ DALL-E 3 generation successful from backend.");
    return result.image;

  } catch (err) {
    console.error("❌ Error calling DALL-E 3 backend:", err);
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred with the DALL-E 3 backend.";
    throw new Error(`DALL-E 3 Generation Failed: ${errorMessage}`);
  }
};

// Shorter DALL-E 3 prompts (under 1000 characters)
const getDallE3Frame1Prompt = (outfitVibe: string): string => `
Edit this bathroom mirror selfie: Remove the woman's current handbag and replace it with the target bag shown in the reference. Keep the woman identical (face, body, pose, hair) and the bathroom scene unchanged. Update her outfit to "${outfitVibe}" style. The new bag must match the target exactly and be held naturally.
`;

const getDallE3Frame4Prompt = (outfitVibe: string): string => `
Edit this bedroom mirror selfie: Remove the woman's current handbag and replace it with the same target bag from Frame 1. Keep the woman identical (face, body, hair) but change her pose. Keep the bedroom scene unchanged. Update her outfit to a different "${outfitVibe}" variation. The bag must match the target exactly.
`;

// Improved Gemini fallback prompts for bag replacement
const getGeminiFallbackFrame1Prompt = (outfitVibe: string): string => `
Create a new version of this bathroom mirror selfie with these specific changes:

REMOVE: The handbag currently being held by the woman
ADD: The specific target handbag shown in the second image (match its exact color, style, and design)
KEEP IDENTICAL: Woman's face, body, pose, hair, bathroom background, lighting, mirror
CHANGE: Her outfit to "${outfitVibe}" style

The woman should be holding ONLY the new target bag. No other bags should be visible.
Generate a photorealistic result focusing on precise object replacement.
`;

const getGeminiFallbackFrame4Prompt = (outfitVibe: string): string => `
Create a new bedroom mirror selfie based on these reference images:

WOMAN: Use the same woman from the first image (identical face, body, hair)
POSE: Create a different pose from the bathroom selfie
OUTFIT: Style her in a different "${outfitVibe}" outfit variation  
BAG: She must hold the exact target bag shown (same color, style, design as target)
SCENE: Keep the bedroom background identical to the second reference image

CRITICAL: She should hold ONLY the target bag. Remove any other bags from the scene.
Generate a photorealistic result with natural lighting and pose.
`;

export const GenerationService = {
  async generateCarouselForBag(
    referenceImages: { frame1: File, frame4: File },
    characterProfile: CharacterProfile,
    scene1Profile: SceneProfile,
    scene2Profile: SceneProfile,
    bag: Bag,
    outfitVibe: string,
    bagImage: File
  ): Promise<string[]> {
    const frames: string[] = [];
    
    // --- FRAME 1: Use DALL-E 3 backend for highest quality bag replacement ---
    console.log("Generating Frame 1 with DALL-E 3...");
    try {
      const frame1Prompt = getDallE3Frame1Prompt(outfitVibe);
      const frame1Image = await generateWithDallE3(referenceImages.frame1, bagImage, frame1Prompt);
      frames.push(frame1Image);
      console.log("✅ Frame 1 (DALL-E 3) complete");
    } catch (error) {
      console.error("❌ Frame 1 DALL-E 3 failed, falling back to Gemini:", error);
      // Improved Gemini fallback with better bag replacement prompt
      const fallbackPrompt = getGeminiFallbackFrame1Prompt(outfitVibe);
      const frame1Image = await generateImageWithGemini(fallbackPrompt, referenceImages.frame1, bagImage);
      frames.push(frame1Image);
      console.log("✅ Frame 1 (Gemini fallback) complete");
    }

    // --- FRAME 2: Use Gemini for product shot ---
    const frame2Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      
      Create a professional product shot of the exact bag shown in the uploaded image:
      - White/cream silk backdrop with soft texture
      - 3/4 angled view (45-degree angle) showing bag's shape and details
      - Professional studio lighting with soft shadows
      - Bag occupies 50-60% of frame, centered
      - High quality, clean, minimalist aesthetic
      - No person or hands in shot
      - Match the bag's color, material, hardware, and distinctive features exactly
    `;
    console.log("Generating Frame 2 with Gemini...");
    const frame2Image = await generateImageWithGemini(frame2Prompt, undefined, bagImage);
    frames.push(frame2Image);
    console.log("✅ Frame 2 (Gemini) complete");

    // --- FRAME 3: Use Gemini for product shot ---
    const frame3Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      
      Create a front-view product shot of the EXACT SAME bag as Frame 2:
      - White/cream silk backdrop with soft texture  
      - Straight-on front view, perfectly centered
      - Professional studio lighting with even illumination
      - Bag occupies 50-60% of frame
      - High quality, clean, minimalist aesthetic
      - No person or hands in shot
      - Must be identical to the bag in the uploaded reference image
      - Ensure consistency with Frame 2 styling
    `;
    console.log("Generating Frame 3 with Gemini...");
    const frame3Image = await generateImageWithGemini(frame3Prompt, undefined, bagImage);
    frames.push(frame3Image);
    console.log("✅ Frame 3 (Gemini) complete");

    // --- FRAME 4: Use DALL-E 3 backend for highest quality bag replacement ---
    console.log("Generating Frame 4 with DALL-E 3...");
    try {
      const frame4Prompt = getDallE3Frame4Prompt(outfitVibe);
      const frame4Image = await generateWithDallE3(referenceImages.frame4, bagImage, frame4Prompt);
      frames.push(frame4Image);
      console.log("✅ Frame 4 (DALL-E 3) complete");
    } catch (error) {
      console.error("❌ Frame 4 DALL-E 3 failed, falling back to Gemini:", error);
      // Improved Gemini fallback with better bag replacement prompt
      const fallbackPrompt = getGeminiFallbackFrame4Prompt(outfitVibe);
      const frame4Image = await generateImageWithGemini(fallbackPrompt, referenceImages.frame4, bagImage);
      frames.push(frame4Image);
      console.log("✅ Frame 4 (Gemini fallback) complete");
    }

    return frames;
  }
};
