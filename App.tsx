import React, { useState, useMemo } from 'react';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import CarouselCard from './components/CarouselCard';
import { MagicWandIcon } from './components/IconComponents';
import JwtErrorHelp from './components/JwtErrorHelp';
import {
  CharacterProfile,
  SceneProfile,
  Bag,
  ReferenceImages,
  GeneratedCarousel,
} from './types';
import { OUTFIT_VIBES } from './constants';
import {
  GenerationService,
  extractCharacterProfile,
  extractScene1Profile,
  extractScene2Profile
} from './services/geminiService';


const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [referenceImages, setReferenceImages] = useState<ReferenceImages>({
    frame1: null,
    frame2: null,
    frame3: null,
    frame4: null,
  });
  const [bagImage, setBagImage] = useState<File | null>(null);
  
  // LOCKED REFERENCE IMAGES - cached after extraction to prevent loss
  const [lockedReferenceImages, setLockedReferenceImages] = useState<ReferenceImages>({
    frame1: null,
    frame2: null,
    frame3: null,
    frame4: null,
  });

  const [selectedOutfitVibe, setSelectedOutfitVibe] = useState(OUTFIT_VIBES[0].name);
  const [profiles, setProfiles] = useState<{
    character: CharacterProfile | null;
    scene1: SceneProfile | null;
    scene2: SceneProfile | null;
  }>({ character: null, scene1: null, scene2: null });
  const [generatedCarousels, setGeneratedCarousels] = useState<GeneratedCarousel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isUploadComplete = useMemo(() =>
    Object.values(referenceImages).every(img => img !== null),
    [referenceImages]
  );
  
  const isProfilesExtracted = useMemo(() =>
    profiles.character !== null && profiles.scene1 !== null && profiles.scene2 !== null,
    [profiles]
  );

  const handleFileSelect = (id: keyof ReferenceImages, file: File | null) => {
    setReferenceImages(prev => ({ ...prev, [id]: file }));
  };
  
  const handleBagImageSelect = (file: File | null) => {
    setBagImage(file);
  };

  const handleExtractProfiles = async () => {
    if (!isUploadComplete) return;
    setIsLoading(true);
    setLoadingMessage('Extracting profiles from reference images...');
    setError(null);
    try {
      const { frame1, frame4 } = referenceImages;
      if (!frame1 || !frame4) throw new Error("Missing reference images for profile extraction.");

      const [charProfile, s1Profile, s2Profile] = await Promise.all([
        extractCharacterProfile(frame1),
        extractScene1Profile(frame1),
        extractScene2Profile(frame4),
      ]);

      setProfiles({ character: charProfile, scene1: s1Profile, scene2: s2Profile });
      setLockedReferenceImages(referenceImages);
      console.log("✅ Profiles extracted and locked");
      console.log("✅ Reference images locked and cached");

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during profile extraction.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerate = async () => {
    if (!profiles.character || !profiles.scene1 || !profiles.scene2 || !bagImage || !lockedReferenceImages.frame1 || !lockedReferenceImages.frame4) {
      setError("Cannot generate. Please ensure profiles are extracted and bag image is uploaded.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedCarousels([]);
  
    try {
      setLoadingMessage('Generating carousel for your bag...');
      
      // Create minimal bag object
      const bag: Bag = {
        id: 'target-bag',
        brand: 'Your Brand',
        model: 'Your Model',
        color: 'Custom',
        material: 'Premium Material',
        styleCode: 'CUSTOM-001',
        details: 'Target bag from uploaded image',
        category: 'Custom'
      };
      
      // USE LOCKED REFERENCE IMAGES - guarantees they persist
      const frames = await GenerationService.generateCarouselForBag(
        { frame1: lockedReferenceImages.frame1!, frame4: lockedReferenceImages.frame4! },
        profiles.character,
        profiles.scene1,
        profiles.scene2,
        bag,
        selectedOutfitVibe,
        bagImage
      );
      
      setGeneratedCarousels([{ bag, frames }]);
      setLoadingMessage('Carousel generated!');
      setStep(2);
      
      console.log("✅ Carousel generated successfully using locked references");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("❌ Generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          <Spinner />
          <p className="mt-4 text-lg text-white">{loadingMessage}</p>
        </div>
      )}

      <header className="py-6 text-center border-b border-gray-700 shadow-md bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-400">BAGIFY</span>
        </h1>
        <p className="text-gray-400 mt-1">AI-Powered TikTok Carousel Generator</p>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {error && (
          error.includes("Invalid JWT Signature") ? (
            <JwtErrorHelp onRetry={handleGenerate} />
          ) : (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline whitespace-pre-wrap">{error}</span>
            </div>
          )
        )}

        {/* Step 1: Upload & Style */}
        {step === 1 && (
          <section>
            <h2 className="text-2xl font-bold mb-2 text-pink-300">Step 1: Upload & Generate</h2>
            <p className="text-gray-400 mb-6">Upload four reference images, extract profiles, then upload your target bag to generate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ImageUploader id="frame1" label="Frame 1: Mirror Look 1" description="Bathroom selfie with bag" onFileSelect={(f) => handleFileSelect('frame1', f)} />
              <ImageUploader id="frame2" label="Frame 2: Bag (Angled)" description="Product shot, 3/4 view" onFileSelect={(f) => handleFileSelect('frame2', f)} />
              <ImageUploader id="frame3" label="Frame 3: Bag (Front)" description="Product shot, front view" onFileSelect={(f) => handleFileSelect('frame3', f)} />
              <ImageUploader id="frame4" label="Frame 4: Mirror Look 2" description="Bedroom selfie, different pose" onFileSelect={(f) => handleFileSelect('frame4', f)} />
            </div>
            
            {!isProfilesExtracted && (
              <>
                <div className="mb-8">
                  <label htmlFor="outfit-vibe" className="block text-lg font-semibold text-pink-300 mb-2">Select Outfit Vibe</label>
                  <select
                      id="outfit-vibe"
                      value={selectedOutfitVibe}
                      onChange={(e) => setSelectedOutfitVibe(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                  >
                      {OUTFIT_VIBES.map(vibe => <option key={vibe.id} value={vibe.name}>{vibe.name}</option>)}
                  </select>
                </div>

                <button
                    onClick={handleExtractProfiles}
                    disabled={!isUploadComplete || isLoading}
                    className="w-full bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                >
                    Extract & Lock Profiles
                </button>
              </>
            )}

            {isProfilesExtracted && (
              <>
                <div className="mb-8 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-300 mb-2">📌 Status</h3>
                  <p className="text-green-400">✅ Profiles extracted and locked</p>
                  <p className="text-green-400">✅ Reference images cached</p>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-pink-300 mb-4">Upload Target Bag</h3>
                  <p className="text-gray-400 mb-4">Upload a target bag image. All 4 frames will use this bag.</p>
                  <div className="max-w-md">
                    <ImageUploader id="bag-image" label="Upload Target Bag" description="Clear image of the bag to generate" onFileSelect={handleBagImageSelect} />
                  </div>
                </div>

                {bagImage && (
                  <div className="mb-8 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-300 mb-2">📦 Target Bag Ready</h3>
                    <p className="text-green-400">Target bag loaded. All 4 frames will use this bag.</p>
                  </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={!bagImage || isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold py-4 px-10 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform text-lg"
                >
                    <MagicWandIcon className="w-6 h-6"/>
                    Generate Carousel
                </button>

                <button
                    onClick={() => {
                      setStep(1);
                      setReferenceImages({frame1: null, frame2: null, frame3: null, frame4: null});
                      setBagImage(null);
                      setProfiles({character: null, scene1: null, scene2: null});
                      setLockedReferenceImages({frame1: null, frame2: null, frame3: null, frame4: null});
                    }}
                    className="w-full mt-4 bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition"
                >
                    Start Over with New References
                </button>
              </>
            )}
          </section>
        )}
        
        {/* Step 2: Results */}
        {step === 2 && (
            <section>
                 <h2 className="text-2xl font-bold mb-2 text-pink-300">Step 2: Your Generated Carousel</h2>
                <p className="text-gray-400 mb-6">Download your carousel or generate another one.</p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <button 
                      onClick={() => { setStep(1); setBagImage(null); }}
                      className="w-full sm:w-auto bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition"
                    >
                      Generate with Different Bag
                    </button>
                    <button 
                      onClick={() => {
                        setStep(1);
                        setReferenceImages({frame1: null, frame2: null, frame3: null, frame4: null});
                        setBagImage(null);
                        setProfiles({character: null, scene1: null, scene2: null});
                        setLockedReferenceImages({frame1: null, frame2: null, frame3: null, frame4: null});
                      }}
                      className="w-full sm:w-auto bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition"
                    >
                      Start Over with New References
                    </button>
                </div>
                <div className="flex flex-col gap-8">
                    {generatedCarousels.map(carousel => (
                        <CarouselCard key={carousel.bag.id} carousel={carousel} />
                    ))}
                </div>
            </section>
        )}

      </main>
      <style>{`
        .btn-secondary {
            background-color: #374151; /* bg-gray-700 */
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: background-color 0.2s;
        }
        .btn-secondary:hover {
            background-color: #4B5563; /* bg-gray-600 */
        }
      `}</style>
    </div>
  );
};

export default App;