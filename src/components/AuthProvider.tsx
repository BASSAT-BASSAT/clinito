'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Doctor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  specialization?: string;
}

interface AuthContextType {
  doctor: Doctor | null;
  isLoading: boolean;
  isApprovedUser: boolean;
  login: (doctor: Doctor) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  isLoading: true,
  isApprovedUser: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Approved emails that can access all features (co-founders)
const APPROVED_EMAILS = [
  'mohamed77bassat@gmail.com',
  'seifamgad447@gmail.com',
  'omarmahmoudahmed2222005@gmail.com',
];

// Pages that don't require authentication (landing is public)
const PUBLIC_PATHS = ['/', '/login'];

// Pages that only approved users can access
const PROTECTED_FEATURE_PATHS = ['/home', '/app', '/patients', '/session', '/settings', '/voice-analysis'];

// Clear all Botpress/chatbot data for privacy between doctors
function clearChatbotData() {
  // Clear localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('bp_') || 
      key.startsWith('botpress') || 
      key.includes('webchat') ||
      key.includes('Botpress') ||
      key === 'clinito_current_doctor_chat'
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current user has approved access
  const isApprovedUser = doctor ? APPROVED_EMAILS.includes(doctor.email.toLowerCase()) : false;

  useEffect(() => {
    // Check for existing session
    const storedDoctor = localStorage.getItem('currentDoctor');
    if (storedDoctor) {
      try {
        setDoctor(JSON.parse(storedDoctor));
      } catch {
        localStorage.removeItem('currentDoctor');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Redirect logic after loading
    if (!isLoading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      const isProtectedPath = PROTECTED_FEATURE_PATHS.some(p => pathname.startsWith(p));
      
      if (!doctor && !isPublicPath) {
        router.push('/');
      } else if (doctor) {
        const userIsApproved = APPROVED_EMAILS.includes(doctor.email.toLowerCase());
        
        if (pathname === '/' || pathname === '/login') {
          // If approved, go to home; otherwise stay on landing or go to pending page
          if (userIsApproved) {
            router.push('/home');
          }
        } else if (isProtectedPath && !userIsApproved) {
          // Non-approved user trying to access protected features
          router.push('/');
        }
      }
    }
  }, [doctor, isLoading, pathname, router]);

  const login = (doctorData: Doctor) => {
    // Check if a different doctor was previously logged in
    const previousDoctor = localStorage.getItem('currentDoctor');
    if (previousDoctor) {
      try {
        const prevDoc = JSON.parse(previousDoctor);
        if (prevDoc.id !== doctorData.id) {
          // Different doctor - clear all chat data for privacy
          clearChatbotData();
        }
      } catch {
        clearChatbotData();
      }
    }
    
    localStorage.setItem('currentDoctor', JSON.stringify(doctorData));
    localStorage.setItem('clinito_current_doctor_chat', doctorData.id);
    setDoctor(doctorData);
    
    // Only redirect to home if user is approved
    if (APPROVED_EMAILS.includes(doctorData.email.toLowerCase())) {
      router.push('/home');
    }
    // Non-approved users stay on landing page
  };

  const logout = () => {
    // Clear all chat data on logout for privacy
    clearChatbotData();
    
    localStorage.removeItem('currentDoctor');
    setDoctor(null);
    
    // Force reload to completely reset the chatbot widget; back to public home
    window.location.href = '/';
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting (to public home)
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isProtectedPath = PROTECTED_FEATURE_PATHS.some(p => pathname.startsWith(p));
  
  if (!doctor && !isPublicPath) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  // Show loading if non-approved user is on protected path (being redirected)
  if (doctor && isProtectedPath && !isApprovedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ doctor, isLoading, isApprovedUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
