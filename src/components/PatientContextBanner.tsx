'use client';

import { useEffect, useState } from 'react';
import { User, X, MessageSquare } from 'lucide-react';

interface PatientContext {
  name: string;
  id: string;
  gender: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
}

export function PatientContextBanner() {
  const [patient, setPatient] = useState<PatientContext | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check for patient context in localStorage
    const checkPatientContext = () => {
      const stored = localStorage.getItem('currentPatient');
      if (stored) {
        try {
          setPatient(JSON.parse(stored));
        } catch {
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
    };

    checkPatientContext();

    // Listen for storage changes
    window.addEventListener('storage', checkPatientContext);
    
    // Also listen for custom event
    const handlePatientChange = (e: CustomEvent) => {
      setPatient(e.detail);
    };
    window.addEventListener('patientContextChange' as any, handlePatientChange);

    return () => {
      window.removeEventListener('storage', checkPatientContext);
      window.removeEventListener('patientContextChange' as any, handlePatientChange);
    };
  }, []);

  const [copied, setCopied] = useState(false);

  const copyPatientInfo = () => {
    if (patient) {
      // Format a message that gives Botpress context
      const message = `I'm consulting about patient ${patient.name} (ID: ${patient.id}). 
Patient details:
- Gender: ${patient.gender}
- Blood Type: ${patient.bloodType}
- Known Allergies: ${patient.allergies}
- Medical History: ${patient.medicalHistory}

Please keep this patient's information in mind for our conversation.`;
      
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const clearContext = () => {
    localStorage.removeItem('currentPatient');
    setPatient(null);
    window.dispatchEvent(new CustomEvent('patientContextChange', { detail: null }));
  };

  if (!patient || !isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-xs">
      <div className="bg-gradient-to-r from-emerald-900/90 to-teal-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-emerald-300">Active Patient</span>
          </div>
          <button
            onClick={clearContext}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        
        <div className="mb-3">
          <p className="text-white font-semibold">{patient.name}</p>
          <p className="text-xs text-white/60">{patient.id}</p>
          <div className="mt-2 text-xs text-white/70 space-y-1">
            <p>Gender: {patient.gender} • Blood: {patient.bloodType}</p>
            {patient.allergies !== 'None' && (
              <p className="text-orange-300">⚠️ Allergies: {patient.allergies}</p>
            )}
          </div>
        </div>

        <button
          onClick={copyPatientInfo}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm transition-all ${
            copied 
              ? 'bg-green-500/30 border-green-500/50 text-green-300' 
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {copied ? '✓ Copied! Paste in chat' : 'Copy for Chatbot'}
        </button>
        <p className="text-[10px] text-white/40 text-center mt-2">
          Click to copy, then paste in the Botpress chat
        </p>
      </div>
    </div>
  );
}
