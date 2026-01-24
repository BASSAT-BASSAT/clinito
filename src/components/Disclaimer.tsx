'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Disclaimer() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-medical-warning/10 border-b border-medical-warning/30">
      <div className="container mx-auto px-4 max-w-7xl py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-medical-warning flex-shrink-0" />
            <p className="text-sm text-medical-warning">
              <strong>Medical Disclaimer:</strong> This AI assistant is for research and educational purposes only. It is <strong>NOT</strong> a substitute for professional medical diagnosis.
            </p>
          </div>
          <button onClick={() => setIsVisible(false)} className="p-1 rounded hover:bg-medical-warning/20 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-medical-warning" />
          </button>
        </div>
      </div>
    </div>
  );
}
