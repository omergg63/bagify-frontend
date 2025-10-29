
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './IconComponents';

interface ImageUploaderProps {
  id: string;
  label: string;
  description: string;
  onFileSelect: (file: File | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, description, onFileSelect }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    } else {
      setPreview(null);
      onFileSelect(null);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  }, []);

  return (
    <div className="flex flex-col space-y-2">
      <label htmlFor={id} className="font-semibold text-lg text-pink-300">{label}</label>
      <p className="text-sm text-gray-400 -mt-1">{description}</p>
      <label
        htmlFor={id}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative aspect-[9/16] w-full rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-pink-400 transition-all duration-300 overflow-hidden ${isDragging ? 'border-pink-500 bg-gray-800' : 'bg-gray-800/50'}`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="object-cover h-full w-full" />
        ) : (
          <div className="text-center text-gray-400 p-4">
            <UploadIcon className="mx-auto h-12 w-12" />
            <p className="mt-2">Click to upload or drag & drop</p>
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="image/png, image/jpeg"
          className="sr-only"
          onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
        />
      </label>
    </div>
  );
};

export default ImageUploader;
