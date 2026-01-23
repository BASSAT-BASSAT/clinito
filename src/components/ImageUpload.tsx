'use client';

import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, FileImage } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
}

export function ImageUpload({ onUpload }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
        isDragging ? 'border-medical-accent bg-medical-accent/10 scale-[1.02]' : 'border-medical-border hover:border-medical-accent/50 hover:bg-medical-bg/50'
      }`}
    >
      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      <div className={`w-20 h-20 rounded-2xl mb-6 flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-medical-accent/20 scale-110' : 'bg-medical-bg'}`}>
        {isDragging ? <FileImage className="w-10 h-10 text-medical-accent" /> : <Upload className="w-10 h-10 text-medical-muted" />}
      </div>
      <h3 className="text-lg font-medium text-medical-text mb-2">{isDragging ? 'Drop your image here' : 'Upload Medical Image'}</h3>
      <p className="text-sm text-medical-muted text-center mb-4">Drag and drop or click to select</p>
      <div className="flex items-center gap-4 text-xs text-medical-muted">
        <div className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /><span>X-Ray</span></div>
        <div className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /><span>CT Scan</span></div>
        <div className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /><span>MRI</span></div>
      </div>
    </div>
  );
}
