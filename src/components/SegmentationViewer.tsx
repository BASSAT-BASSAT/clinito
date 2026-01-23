'use client';

import { useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Layers, Eye, EyeOff } from 'lucide-react';

interface SegmentationViewerProps {
  imageUrl: string;
  maskUrl?: string;
  onReset: () => void;
}

export function SegmentationViewer({ imageUrl, maskUrl, onReset }: SegmentationViewerProps) {
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg bg-medical-bg hover:bg-medical-border transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4 text-medical-muted" />
          </button>
          <span className="text-sm text-medical-muted min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-2 rounded-lg bg-medical-bg hover:bg-medical-border transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4 text-medical-muted" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {maskUrl && (
            <button 
              onClick={() => setShowMask(!showMask)} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showMask ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-medical-bg text-medical-muted hover:bg-medical-border'}`}
            >
              {showMask ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm">Mask {showMask ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <button onClick={onReset} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-medical-bg hover:bg-medical-border text-medical-muted transition-colors">
            <RotateCcw className="w-4 h-4" /><span className="text-sm">Reset</span>
          </button>
        </div>
      </div>

      {/* Mask Opacity Slider */}
      {maskUrl && showMask && (
        <div className="flex items-center gap-3 p-3 bg-medical-bg/50 rounded-lg">
          <Layers className="w-4 h-4 text-green-400" />
          <span className="text-sm text-medical-muted">Mask Opacity</span>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={maskOpacity} 
            onChange={(e) => setMaskOpacity(parseFloat(e.target.value))} 
            className="flex-1 h-2 bg-medical-border rounded-full appearance-none cursor-pointer accent-green-500" 
          />
          <span className="text-sm text-green-400 font-medium min-w-[3rem]">{Math.round(maskOpacity * 100)}%</span>
        </div>
      )}

      {/* Mask indicator */}
      {maskUrl && (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded bg-green-500/70"></div>
          <span className="text-medical-muted">Segmented region highlighted in green</span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ minHeight: '400px' }}>
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-200" 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {/* Base Image */}
          <img 
            src={imageUrl} 
            alt="Medical scan" 
            className="max-w-full max-h-[500px] object-contain"
            style={{ display: 'block' }}
          />

          {/* Mask Overlay - positioned absolutely over the image */}
          {maskUrl && showMask && (
            <img
              src={maskUrl}
              alt="Segmentation mask"
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: maskOpacity,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
