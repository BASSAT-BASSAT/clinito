'use client';

import { Stethoscope, Settings, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-medical-card/80 backdrop-blur-xl border-b border-medical-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medical-primary to-medical-accent flex items-center justify-center glow-teal">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-medical-text">
                MedAssist<span className="text-medical-accent">AI</span>
              </h1>
              <p className="text-xs text-medical-muted -mt-0.5">Medical Image Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-medical-bg transition-colors">
              <Settings className="w-5 h-5 text-medical-muted hover:text-medical-text" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-medical-bg transition-colors">
              <div className="w-8 h-8 rounded-full bg-medical-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-medical-text hidden sm:block">Doctor</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
