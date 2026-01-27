'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Camera, Upload, X, Users, Image as ImageIcon, 
  Stethoscope, Menu, LogOut, Mic, MicOff, Loader2,
  Volume2, VolumeX, Brain
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { doctor, logout } = useAuth();
  
  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Analysis states
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('Upload or take a photo to begin');
  
  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageFileRef = useRef<File | null>(null);
  const imagePreviewRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep refs in sync
  useEffect(() => {
    imageFileRef.current = imageFile;
  }, [imageFile]);

  useEffect(() => {
    imagePreviewRef.current = imagePreview;
  }, [imagePreview]);

  // Analysis keywords for voice commands
  const analysisKeywords = ['highlight', 'find', 'show', 'analyze', 'detect', 'look for', 'check', 'scan'];

  const parseAnalysisCommand = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    for (const keyword of analysisKeywords) {
      if (lowerText.includes(keyword)) {
        const parts = lowerText.split(keyword);
        if (parts.length > 1) {
          const target = parts[1].trim().replace(/^(the|a|an|any)\s+/i, '').trim();
          if (target.length > 0) return target;
        }
      }
    }
    return null;
  };

  // Handle file selection (gallery/desktop)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    setShowImageOptions(false);
  };

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    setShowImageOptions(false);
  };

  // Process the image file
  const processImageFile = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setMaskUrl(null);
    setAnalysisResult(null);
    setConfidence(0);
    setStatus('Image loaded. Use voice or quick analysis.');
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setMaskUrl(null);
    setAnalysisResult(null);
    setConfidence(0);
    setStatus('Upload or take a photo to begin');
  };

  // Create demo mask when SAM3 server is not available
  const createDemoMask = useCallback((prompt: string) => {
    setStatus('Demo Mode - analyzing...');
    const currentPreview = imagePreviewRef.current;
    
    if (currentPreview) {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw a visible highlight circle
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const radius = Math.min(canvas.width, canvas.height) / 3;
          
          // Semi-transparent blue fill
          ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Blue border
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 4;
          ctx.stroke();
          
          const demoMaskUrl = canvas.toDataURL('image/png');
          setMaskUrl(demoMaskUrl);
          setAnalysisResult(`Demo: "${prompt}" area highlighted. SAM3 server not running.`);
          setConfidence(0.5);
          setStatus('Demo analysis complete');
          speakText(`Demo mode. ${prompt} area highlighted.`);
        }
      };
      img.src = currentPreview;
    }
  }, []);

  // SAM3 Analysis
  const runAnalysis = async (prompt: string) => {
    const currentImageFile = imageFileRef.current;
    if (!currentImageFile) {
      setStatus('Upload an image first');
      speakText("Please upload an image first.");
      return;
    }

    setIsAnalyzing(true);
    setStatus(`Analyzing: "${prompt}"...`);

    try {
      const formData = new FormData();
      formData.append('image', currentImageFile);
      formData.append('prompt', prompt);

      const response = await fetch('/api/sam3/segment', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const maskUrlValue = result.mask_url || result.maskDataUrl || result.overlayDataUrl;
        setMaskUrl(maskUrlValue);
        setAnalysisResult(result.description || `Found: ${prompt}`);
        setConfidence(result.confidence || 0.85);
        setStatus('Analysis complete');
        speakText(`Analysis complete. ${prompt} detected with ${Math.round((result.confidence || 0.85) * 100)} percent confidence.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503 || errorData.error?.includes('not running')) {
          createDemoMask(prompt);
        } else {
          setStatus(`Analysis failed: ${errorData.error || 'Unknown error'}`);
          createDemoMask(prompt);
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      createDemoMask(prompt);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text-to-Speech with ElevenLabs
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => setIsSpeaking(false);
        await audioRef.current.play();
        return;
      }
    } catch (error) {
      console.error('TTS error:', error);
    }

    // Fallback to browser speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // Handle transcript from STT
  const handleTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    setStatus(`Heard: "${transcript}"`);
    
    const analysisTarget = parseAnalysisCommand(transcript);
    if (analysisTarget) {
      await runAnalysis(analysisTarget);
    } else {
      // If no analysis command detected, try to analyze with the full text
      await runAnalysis(transcript);
    }
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    stopSpeaking();
    if (!imageFileRef.current) {
      setStatus('Upload an image first');
      speakText("Please upload an image first.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Voice not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) {
          setStatus('No audio recorded.');
          setIsRecording(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        setStatus('Transcribing with ElevenLabs...');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              await handleTranscript(data.text);
            } else {
              setStatus('No speech detected. Try again.');
            }
          } else {
            setStatus('Transcription failed. Try again.');
          }
        } catch (error) {
          console.error('STT error:', error);
          setStatus('Failed to transcribe. Try again.');
        } finally {
          setIsTranscribing(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Listening... Tap to stop');

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 10000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setStatus('Microphone access denied.');
      } else {
        setStatus('Recording error. Try again.');
      }
      setIsRecording(false);
    }
  }, [handleTranscript]);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Quick analysis options
  const quickOptions = ['Tumor', 'Fracture', 'Nodule', 'Lesion', 'Mass', 'Opacity'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg">Clinito</span>
              {doctor && (
                <p className="text-xs text-gray-500">Dr. {doctor.firstName} {doctor.lastName}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link 
              href="/patients"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Patients</span>
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <Link
                      href="/patients"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700"
                      onClick={() => setShowMenu(false)}
                    >
                      <Users className="w-4 h-4" />
                      My Patients
                    </Link>
                    {doctor ? (
                      <button
                        onClick={() => { logout(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-blue-600"
                        onClick={() => setShowMenu(false)}
                      >
                        <LogOut className="w-4 h-4" />
                        Login
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Image Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4">
          {imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Medical image" 
                className="w-full h-64 sm:h-80 object-contain bg-gray-100"
              />
              {maskUrl && (
                <img 
                  src={maskUrl} 
                  alt="Analysis overlay" 
                  className="absolute inset-0 w-full h-64 sm:h-80 object-contain pointer-events-none"
                  style={{ opacity: 0.7 }}
                />
              )}
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div 
              className="h-64 sm:h-80 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
              onClick={() => setShowImageOptions(true)}
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-gray-600 font-medium">Tap to add image</p>
              <p className="text-gray-400 text-sm mt-1">From camera or gallery</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">{status}</p>
          {analysisResult && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 font-medium">{analysisResult}</p>
              {confidence > 0 && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className="flex-1 max-w-xs h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-blue-600 font-medium">{Math.round(confidence * 100)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Analysis Options (shown when image is uploaded) */}
        {imagePreview && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">Quick Analysis</p>
            <div className="grid grid-cols-3 gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => runAnalysis(option.toLowerCase())}
                  disabled={isAnalyzing}
                  className="py-2.5 px-3 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setShowImageOptions(true)}
            className="flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition shadow-sm"
          >
            <Camera className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700">
              {imagePreview ? 'Change' : 'Add Image'}
            </span>
          </button>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || !imagePreview}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl transition shadow-sm disabled:opacity-50 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isTranscribing ? 'Processing...' : isRecording ? 'Stop' : 'Voice Analysis'}
            </span>
          </button>
        </div>

        {/* View Patients Link */}
        <Link
          href="/patients"
          className="flex items-center justify-center gap-2 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">View Patients</span>
        </Link>

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 z-40 bg-white/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
              <Brain className="w-12 h-12 text-blue-600 animate-pulse" />
              <p className="text-gray-700 font-medium">Analyzing with SAM3...</p>
            </div>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="fixed bottom-24 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg animate-pulse"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        )}
      </main>

      {/* Image Options Modal */}
      {showImageOptions && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setShowImageOptions(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 text-center">Add Image</h3>
            </div>
            <div className="p-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl transition"
              >
                <div className="p-3 bg-blue-100 rounded-full">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Take Photo</p>
                  <p className="text-sm text-gray-500">Use your camera</p>
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl transition"
              >
                <div className="p-3 bg-green-100 rounded-full">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Upload from Gallery</p>
                  <p className="text-sm text-gray-500">Choose from your files</p>
                </div>
              </button>
            </div>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setShowImageOptions(false)}
                className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden safe-bottom">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center gap-1 p-2 text-blue-600">
            <Brain className="w-5 h-5" />
            <span className="text-xs font-medium">Analyze</span>
          </button>
          <Link href="/patients" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <Users className="w-5 h-5" />
            <span className="text-xs">Patients</span>
          </Link>
          <button 
            onClick={() => imagePreview ? (isRecording ? stopRecording() : startRecording()) : setShowImageOptions(true)}
            className={`flex flex-col items-center gap-1 p-2 ${isRecording ? 'text-red-500' : 'text-gray-400'}`}
          >
            <Mic className="w-5 h-5" />
            <span className="text-xs">{isRecording ? 'Stop' : 'Voice'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
