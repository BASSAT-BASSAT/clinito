'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useAuth } from './AuthProvider';

// Clear all Botpress data from localStorage
function clearBotpressData() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('bp_') || 
      key.startsWith('botpress') || 
      key.includes('webchat') ||
      key.includes('Botpress')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Also clear sessionStorage
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('bp_') || 
      key.startsWith('botpress') || 
      key.includes('webchat') ||
      key.includes('Botpress')
    )) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
}

export function ChatbotProvider() {
  const { doctor } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);
  const currentDoctorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!doctor) {
      // When logged out, clear all botpress data and hide
      clearBotpressData();
      setShouldRender(false);
      currentDoctorRef.current = null;
      
      // Remove any existing Botpress widget from DOM
      const widget = document.getElementById('bp-web-widget');
      if (widget) {
        widget.remove();
      }
      const container = document.getElementById('bp-web-widget-container');
      if (container) {
        container.remove();
      }
      return;
    }

    // Get the last doctor who used the chat
    const lastDoctorId = localStorage.getItem('clinito_current_doctor_chat');
    
    // If different doctor is logging in, clear previous chat data
    if (lastDoctorId && lastDoctorId !== doctor.id) {
      clearBotpressData();
      
      // Remove existing widget
      const widget = document.getElementById('bp-web-widget');
      if (widget) {
        widget.remove();
      }
      const container = document.getElementById('bp-web-widget-container');
      if (container) {
        container.remove();
      }
      
      // Force page reload to reinitialize with new doctor
      localStorage.setItem('clinito_current_doctor_chat', doctor.id);
      window.location.reload();
      return;
    }
    
    // Store current doctor ID for chat isolation
    localStorage.setItem('clinito_current_doctor_chat', doctor.id);
    currentDoctorRef.current = doctor.id;
    setShouldRender(true);
    
  }, [doctor]);

  // Don't render if no doctor or during transition
  if (!doctor || !shouldRender) {
    return null;
  }

  return (
    <>
      <Script 
        src="https://cdn.botpress.cloud/webchat/v3.5/inject.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Initialize with doctor-specific user ID for complete privacy
          if (window.botpressWebChat && doctor) {
            // Use a unique key combining doctor ID to ensure isolation
            const uniqueUserId = `dr_${doctor.id}_${doctor.email.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            window.botpressWebChat.init({
              // Unique user ID ensures completely separate conversation
              userId: uniqueUserId,
              // Pass doctor info for context
              userData: {
                uniqueId: uniqueUserId,
                doctorId: doctor.id,
                doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
                email: doctor.email,
                specialization: doctor.specialization || 'General',
              },
            });
          }
        }}
      />
      <Script 
        src="https://files.bpcontent.cloud/2026/01/23/09/20260123091128-V0WNET1N.js"
        strategy="afterInteractive"
      />
    </>
  );
}
