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

// Generate image using Backend (Imagen 3) for Frames 1 & 4
const generateWithImagen3 = async (
  referenceImage: File,
  bagImage: File,
  prompt: string
): Promise<string> => {
  const backendUrl = `${import.meta.env.VITE_BACKEND_URL || 'https://bagify-backend.vercel.app'}/api/imagen3/generate`;

  try {
    console.log(`🖼️ Calling Imagen 3 backend at ${backendUrl}...`);

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
    
    console.log("✅ Imagen 3 generation successful from backend.");
    return result.image;

  } catch (err) {
    console.error("❌ Error calling Imagen 3 backend:", err);
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred with the Imagen 3 backend.";
    throw new Error(`Imagen 3 Generation Failed: ${errorMessage}`);
  }
};

// Prompts for Imagen 3 (Frames 1 & 4)
const getImagen3Frame1Prompt = (outfitVibe: string): string => `
Photorealistic edit of a mirror selfie.
The original image shows a woman in a bathroom.
The second image provided is a target bag.

**PRIMARY GOAL: Replace the bag in the woman's hands with the target bag. The new bag must be an EXACT, pixel-perfect copy of the target bag image.**

**SECONDARY GOAL: Change the woman's outfit to a new style: "${outfitVibe}".**

**STRICT RULES - DO NOT CHANGE:**
1.  **Woman:** Her face, body, skin tone, hair, pose, and hand positions must remain IDENTICAL to the original photo.
2.  **Scene:** The bathroom background, including mirror, walls, lighting, and camera angle, must remain IDENTICAL.

**EXECUTION DETAILS FOR BAG:**
-   **Clarity:** The replaced bag must be extremely sharp and clear, with all details like monograms, hardware, and texture perfectly visible and crisp, matching professional product photography.
-   **Integration:** The bag must be held naturally in her hands, perfectly integrated into the scene's lighting.
`;

const getImagen3Frame4Prompt = (outfitVibe: string): string => `
Photorealistic edit of a mirror selfie.
The original image shows a woman in a bedroom.
The second image provided is a target bag.

**GOAL: Create a new version with the same woman in a different pose, holding the SAME TARGET BAG.**

**STRICT RULES - DO NOT CHANGE:**
1.  **Woman's Identity:** She must be IDENTICAL to the woman in Frame 1 (same face, hair, body, skin tone).
2.  **Scene:** The bedroom background, including furniture, lighting, and camera angle, must remain IDENTICAL to the original bedroom photo.
3.  **Bag:** The bag she holds must be an EXACT, pixel-perfect copy of the target bag image, and IDENTICAL to the bag generated in Frame 1.

**STRICT RULES - THINGS TO CHANGE:**
1.  **Pose:** The woman's pose must be NOTICEABLY DIFFERENT from her pose in Frame 1.
2.  **Outfit:** Her outfit must be a DIFFERENT styling variation of the "${outfitVibe}" theme.

**EXECUTION DETAILS FOR BAG:**
-   **Clarity & Consistency:** The bag must be extremely sharp and clear, just like in Frame 1. It must be recognizable as the exact same bag.
-   **Integration:** The bag must be held naturally in her new pose, integrated into the scene's lighting.
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
    
    // --- FRAME 1: Use Imagen 3 backend for highest quality ---
    console.log("Generating Frame 1 with Imagen 3...");
    try {
      const frame1Prompt = getImagen3Frame1Prompt(outfitVibe);
      const frame1Image = await generateWithImagen3(referenceImages.frame1, bagImage, frame1Prompt);
      frames.push(frame1Image);
      console.log("✅ Frame 1 (Imagen 3) complete");
    } catch (error) {
      console.error("❌ Frame 1 Imagen 3 failed, falling back to Gemini:", error);
      // Fallback to Gemini if Imagen 3 fails
      const fallbackPrompt = `Edit this mirror selfie by replacing the woman's bag with the target bag. Keep the woman identical (face, body, hair, pose). Keep the bathroom scene identical. Update her outfit to "${outfitVibe}" style.`;
      const frame1Image = await generateImageWithGemini(fallbackPrompt, referenceImages.frame1, bagImage);
      frames.push(frame1Image);
      console.log("✅ Frame 1 (Gemini fallback) complete");
    }

    // --- FRAME 2: Use Gemini for fast product shot ---
    const frame2Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      CRITICAL: Generate a product shot of the exact bag shown in the uploaded image. Match the style, color, material, and details precisely.
      Requirements: White/cream silk backdrop, angled 3/4 view (45-degree angle), bag occupies 50-60% of frame, professional studio lighting with soft shadows, no person, high quality, clean, minimalist.
    `;
    console.log("Generating Frame 2 with Gemini...");
    const frame2Image = await generateImageWithGemini(frame2Prompt, undefined, bagImage);
    frames.push(frame2Image);
    console.log("✅ Frame 2 (Gemini) complete");

    // --- FRAME 3: Use Gemini for fast product shot ---
    const frame3Prompt = `
      Professional luxury handbag product photography. 1080x1920px vertical.
      CRITICAL: Generate a front-view product shot of the EXACT SAME bag as Frame 2. Use the uploaded bag image to ensure consistency.
      Requirements: White/cream silk backdrop, straight-on front view, centered, bag occupies 50-60% of frame, professional studio lighting, even illumination, no person, high quality, clean, minimalist.
    `;
    console.log("Generating Frame 3 with Gemini...");
    const frame3Image = await generateImageWithGemini(frame3Prompt, undefined, bagImage);
    frames.push(frame3Image);
    console.log("✅ Frame 3 (Gemini) complete");

    // --- FRAME 4: Use Imagen 3 backend for highest quality ---
    console.log("Generating Frame 4 with Imagen 3...");
    try {
      const frame4Prompt = getImagen3Frame4Prompt(outfitVibe);
      const frame4Image = await generateWithImagen3(referenceImages.frame4, bagImage, frame4Prompt);
      frames.push(frame4Image);
      console.log("✅ Frame 4 (Imagen 3) complete");
    } catch (error) {
      console.error("❌ Frame 4 Imagen 3 failed, falling back to Gemini:", error);
      // Fallback to Gemini if Imagen 3 fails
      const fallbackPrompt = `Create a bedroom mirror selfie with the same woman holding the same target bag. Same woman as Frame 1. Same bedroom background. DIFFERENT pose from Frame 1. Different "${outfitVibe}" outfit variation.`;
      const frame4Image = await generateImageWithGemini(fallbackPrompt, referenceImages.frame4, bagImage);
      frames.push(frame4Image);
      console.log("✅ Frame 4 (Gemini fallback) complete");
    }

    return frames;
  }
};
