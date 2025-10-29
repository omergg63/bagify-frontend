
export interface CharacterProfile {
  faceDescriptor: string;
  bodyDescriptor: string;
  skinTone: string;
  hairStyle: string;
  accessories: string;
  nailColor: string;
  distinguishingFeatures: string;
}

export interface SceneProfile {
  location: string;
  background: string;
  lighting: string;
  cameraAngle: string;
  mirror?: string; // Optional for scene 1
  surfaceType?: string; // Optional for scene 1
  furniture: string;
  colorPalette: string;
  ceiling: string;
}

export interface Bag {
  id: string;
  brand: string;
  model: string;
  color: string;
  material: string;
  styleCode: string;
  details: string;
  category: string;
}

export type OutfitVibe = {
  id: string;
  name: string;
};

export interface ReferenceImages {
  frame1: File | null;
  frame2: File | null;
  frame3: File | null;
  frame4: File | null;
}

export interface GeneratedCarousel {
  bag: Bag;
  frames: string[]; // Array of base64 image strings
}
