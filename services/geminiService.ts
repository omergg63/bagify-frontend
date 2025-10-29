import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CharacterProfile, SceneProfile, Bag } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

// Extract bag details for better prompting
const extractBagDescription = async (bagImage: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(bagImage);
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { 
            parts: [
                imagePart, 
                { text: `Analyze this handbag and provide a detailed description including:
                - Brand name (if visible)
                - Bag type and style
                - Color and material
                - Distinctive patterns, logos, or monograms
                - Hardware details (handles, zippers, buckles, chains)
                - Size and proportions
                - Any unique identifying features
                
                Be extremely specific about colors, textures, and distinctive elements.` }
            ] 
        },
    });

    return result.text.trim();
};

// Generate image using Gemini (ALL FRAMES NOW)
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

// OPTIMIZED PROMPTS FOR GEMINI
const getGeminiFrame1Prompt = (outfitVibe: string, bagDescription: string): string => `
TASK: Edit this mirror selfie by replacing the woman's bag with the target bag.

REFERENCE IMAGES:
- Image 1: Woman in bathroom mirror selfie
- Image 2: Target handbag to place in the scene

TARGET BAG TO REPLICATE: ${bagDescription}

INSTRUCTIONS:
1. Keep the woman identical (face, body, hair, pose)
2. Keep the bathroom scene identical (lighting, background, mirrors)
3. Replace her current bag with the target bag: ${bagDescription}
4. Update her outfit to "${outfitVibe}" style
5. Make the bag replacement look natural and seamless

CRITICAL: The bag must match the description exactly: ${bagDescription}
`;

const getGeminiFrame4Prompt = (outfitVibe: string, bagDescription: string): string => `
TASK: Create a bedroom mirror selfie with the same woman holding the same target bag.

REFERENCE IMAGES:
- Image 1: Woman in bedroom mirror selfie
- Image 2: Target handbag (must be identical to Frame 1)

TARGET BAG TO REPLICATE: ${bagDescription}

INSTRUCTIONS:
1. Same woman as Frame 1 (identical face, body, hair)
2. Same bedroom background and lighting
3. DIFFERENT pose from Frame 1
4. Different "${outfitVibe}" outfit variation
5. She must hold the exact same bag: ${bagDescription}

CRITICAL: The bag must be identical to Frame 1 and match: ${bagDescription}

CONSISTENCY CHECK: Compare the bag to Frame 1 - it must be the exact same bag.
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
    
    // STEP 1: Analyze the bag for better prompts
    console.log("🔍 Analyzing target bag...");
    const bagDescription = await extractBagDescription(bagImage);
    console.log("✅ Bag analysis:", bagDescription.substring(0, 100) + "...");
    
    // --- FRAME 1: Gemini with bag-aware prompt ---
    console.log("Generating Frame 1 with Gemini...");
    const frame1Prompt = getGeminiFrame1Prompt(outfitVibe, bagDescription);
    const frame1Image = await generateImageWithGemini(frame1Prompt, referenceImages.frame1, bagImage);
    frames.push(frame1Image);
    console.log("✅ Frame 1 (Gemini) complete");

    // --- FRAME 2: Product shot ---
    const frame2Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      
      TARGET BAG: ${bagDescription}
      
      Create a professional product shot of this exact bag with:
      - White/cream silk backdrop
      - 3/4 angled view (45-degree angle)
      - Professional studio lighting with soft shadows
      - Bag occupies 50-60% of frame
      - High quality, clean, minimalist aesthetic
      - No person in shot
      
      Match all details from the reference image exactly.
    `;
    console.log("Generating Frame 2 with Gemini...");
    const frame2Image = await generateImageWithGemini(frame2Prompt, undefined, bagImage);
    frames.push(frame2Image);
    console.log("✅ Frame 2 (Gemini) complete");

    // --- FRAME 3: Product shot ---
    const frame3Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      
      TARGET BAG: ${bagDescription}
      
      Create a front-view product shot of the EXACT SAME bag as Frame 2:
      - White/cream silk backdrop
      - Straight-on front view, centered
      - Professional studio lighting, even illumination
      - Bag occupies 50-60% of frame
      - High quality, clean, minimalist aesthetic
      - No person in shot
      
      Must be identical to Frame 2 bag: ${bagDescription}
    `;
    console.log("Generating Frame 3 with Gemini...");
    const frame3Image = await generateImageWithGemini(frame3Prompt, undefined, bagImage);
    frames.push(frame3Image);
    console.log("✅ Frame 3 (Gemini) complete");

    // --- FRAME 4: Gemini with enhanced consistency prompt ---
    console.log("Generating Frame 4 with Gemini...");
    const frame4Prompt = getGeminiFrame4Prompt(outfitVibe, bagDescription);
    const frame4Image = await generateImageWithGemini(frame4Prompt, referenceImages.frame4, bagImage);
    frames.push(frame4Image);
    console.log("✅ Frame 4 (Gemini) complete");

    return frames;
  }
};