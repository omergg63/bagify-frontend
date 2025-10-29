
import React from 'react';
import { GeneratedCarousel } from '../types';
import { DownloadIcon } from './IconComponents';

// This is a browser-only global from the script tag in index.html
declare const JSZip: any;

interface CarouselCardProps {
  carousel: GeneratedCarousel;
}

const CarouselCard: React.FC<CarouselCardProps> = ({ carousel }) => {
  const handleDownload = async () => {
    const zip = new JSZip();
    const carouselName = `${carousel.bag.brand}_${carousel.bag.model}`.replace(/\s+/g, '_');

    const metadata = {
      bag: carousel.bag,
      generatedAt: new Date().toISOString(),
    };
    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    for (let i = 0; i < carousel.frames.length; i++) {
        const base64Data = carousel.frames[i];
        // The base64 string is the data itself, without the data URL prefix
        zip.file(`${carouselName}_frame${i + 1}.png`, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${carouselName}_carousel.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-4 border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-pink-300">{carousel.bag.brand} <span className="text-white font-normal">{carousel.bag.model}</span></h3>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <DownloadIcon />
          Download
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {carousel.frames.map((frame, index) => (
          <div key={index} className="aspect-[9/16] rounded-md overflow-hidden bg-gray-700">
            <img src={`data:image/png;base64,${frame}`} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarouselCard;
