'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, VolumeX, Stethoscope, Upload, X, Brain, ImageIcon } from 'lucide-react';

// Declare SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoiceAnalysisPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('Upload an image to start');
  const [lastTranscript, setLastTranscript] = useState('');
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(false); // Try ElevenLabs first
  
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [maskOpacity, setMaskOpacity] = useState(0.6);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const imageFileRef = useRef<File | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    imageFileRef.current = imageFile;
  }, [imageFile]);

  // Keywords that trigger SAM analysis
  const analysisKeywords = ['highlight', 'find', 'show', 'analyze', 'detect', 'look for', 'check', 'scan', 'identify', 'locate'];

  // Check if transcript contains analysis command
  const parseAnalysisCommand = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    for (const keyword of analysisKeywords) {
      if (lowerText.includes(keyword)) {
        // Extract what comes after the keyword
        const parts = lowerText.split(keyword);
        if (parts.length > 1) {
          const target = parts[1].trim().replace(/^(the|a|an|any)\s+/i, '').trim();
          if (target.length > 0) {
            return target;
          }
        }
      }
    }
    return null;
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMaskUrl(null);
      setAnalysisResult(null);
      setStatus('Ready - Say "highlight [condition]" to analyze');
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setMaskUrl(null);
    setAnalysisResult(null);
    setStatus('Upload an image to start');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run SAM analysis
  const runAnalysis = async (prompt: string) => {
    // Use ref to get current image file (avoids stale closure)
    const currentImageFile = imageFileRef.current;
    
    if (!currentImageFile) {
      speakText("Upload image first doctor.");
      setStatus('No image uploaded');
      return;
    }

    setIsAnalyzing(true);
    setStatus(`🔍 Analyzing for "${prompt}"...`);
    
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
        setMaskUrl(result.mask_url);
        setAnalysisResult(result.description);
        setStatus('✅ Analysis complete');
        
        // Short spoken response
        const confidence = Math.round((result.confidence || 0.5) * 100);
        speakText(`Done doctor. ${prompt} detected. ${confidence} percent.`);
      } else {
        setStatus('❌ Analysis failed');
        speakText("Analysis failed doctor.");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('❌ Analysis error');
      speakText("Error doctor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text-to-Speech - Try ElevenLabs first, fallback to browser
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setIsSpeaking(true);
    
    // Try ElevenLabs first if not using browser speech
    if (!useBrowserSpeech) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          
          if (audioRef.current) {
            audioRef.current.pause();
          }
          
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            setIsSpeaking(false);
          };
          await audioRef.current.play();
          return;
        }
      } catch (error) {
        console.error('ElevenLabs TTS error, falling back to browser:', error);
      }
    }
    
    // Fallback to browser speech synthesis (English)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
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
    setIsSpeaking(false);
  };

  // Handle transcript result
  const handleTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setStatus('No speech detected');
      return;
    }
    
    setLastTranscript(transcript);
    
    // Check if it's an analysis command
    const analysisTarget = parseAnalysisCommand(transcript);
    
    if (analysisTarget) {
      // Run SAM analysis
      await runAnalysis(analysisTarget);
    } else {
      // Just acknowledge what was said
      setStatus(`Heard: "${transcript}"`);
      speakText(`Say highlight, then what to find.`);
    }
  }, []);

  // Speech-to-Text using Browser's Web Speech API (works offline, no API limits!)
  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('❌ Speech recognition not supported');
      speakText("Use Chrome doctor.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('🎤 Listening... Say "highlight [condition]"');
    };
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Recognized:', transcript);
      setIsRecording(false);
      setIsTranscribing(true);
      setStatus('Processing...');
      await handleTranscript(transcript);
      setIsTranscribing(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        setStatus('❌ Microphone permission denied');
      } else {
        setStatus(`Error: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [handleTranscript]);

  // Speech-to-Text with ElevenLabs (backup)
  const startElevenLabsRecording = useCallback(async () => {
    setStatus('🎤 Requesting microphone...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioBlob.size < 1000) {
          setStatus('Recording too short');
          return;
        }
        
        setIsTranscribing(true);
        setStatus('🎯 Transcribing...');
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          
          if (response.ok) {
            const data = await response.json();
            await handleTranscript(data.text || '');
          } else {
            setStatus('Transcription failed - try browser speech');
            setUseBrowserSpeech(true);
          }
        } catch (error) {
          console.error('STT error:', error);
          setStatus('Error - try again');
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setStatus('🎤 Listening... Say "highlight [condition]"');
    } catch (error) {
      console.error('Recording error:', error);
      setStatus('❌ Microphone error');
    }
  }, [handleTranscript]);

  // Main start recording function
  const startRecording = useCallback(async () => {
    stopSpeaking();
    
    // Use ref to check current image file
    if (!imageFileRef.current) {
      setStatus('Please upload an image first');
      speakText("Upload image first doctor.");
      return;
    }
    
    if (useBrowserSpeech) {
      startBrowserRecognition();
    } else {
      await startElevenLabsRecording();
    }
  }, [useBrowserSpeech, startBrowserRecognition, startElevenLabsRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/25">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Voice Medical Analysis</h1>
              <p className="text-xs text-teal-400/80">Say "highlight fracture" to analyze</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          
          {/* Left: Image Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-teal-400" />
              Medical Image
            </h2>
            
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-teal-500/50 hover:bg-teal-500/5 transition-all"
              >
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/70 mb-2">Click to upload medical image</p>
                <p className="text-white/40 text-sm">X-ray, CT, MRI, etc.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 z-20 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                
                <div className="relative rounded-2xl overflow-hidden bg-black">
                  <img
                    src={imagePreview}
                    alt="Medical image"
                    className="w-full h-auto"
                  />
                  {maskUrl && (
                    <img
                      src={maskUrl}
                      alt="Segmentation mask"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{ opacity: maskOpacity }}
                    />
                  )}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto mb-2" />
                        <p className="text-white">Analyzing...</p>
                      </div>
                    </div>
                  )}
                </div>

                {maskUrl && (
                  <div className="mt-4">
                    <label className="text-sm text-white/70 block mb-2">Mask Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={maskOpacity}
                      onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>
                )}

                {analysisResult && (
                  <div className="mt-4 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <p className="text-sm text-white/80">{analysisResult}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Voice Control Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-400" />
              Voice Commands
            </h2>

            {/* Status */}
            <div className="mb-6 p-4 bg-black/30 rounded-2xl border border-white/5">
              <p className="text-sm text-white font-medium">{status}</p>
              {lastTranscript && (
                <p className="mt-2 text-xs text-white/50">
                  Last: "{lastTranscript}"
                </p>
              )}
            </div>

            {/* Mic Button */}
            <div className="flex flex-col items-center mb-6">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing || isAnalyzing}
                className={`relative w-24 h-24 rounded-full transition-all duration-300 transform hover:scale-105 ${
                  isRecording 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/50 animate-pulse' 
                    : isTranscribing || isAnalyzing
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : !imageFile
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-2xl shadow-teal-500/40 hover:shadow-teal-500/60'
                } disabled:opacity-50`}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                )}
                <div className="relative z-10">
                  {isTranscribing || isAnalyzing ? (
                    <Loader2 className="w-10 h-10 text-white mx-auto animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-10 h-10 text-white mx-auto" />
                  ) : (
                    <Mic className="w-10 h-10 text-white mx-auto" />
                  )}
                </div>
              </button>
              <p className="mt-3 text-sm text-white/60">
                {!imageFile ? 'Upload image first' : isRecording ? 'Tap to stop' : 'Tap to speak'}
              </p>
            </div>

            {/* Speaking controls */}
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl transition-all"
              >
                <VolumeX className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300">Stop Speaking</span>
              </button>
            )}

            {/* Example commands */}
            <div className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-xl p-4">
              <h3 className="font-medium text-teal-300 mb-3">Example voice commands:</h3>
              <ul className="text-sm text-white/60 space-y-2">
                <li>"<span className="text-teal-400">Highlight</span> fracture"</li>
                <li>"<span className="text-teal-400">Find</span> tumor"</li>
                <li>"<span className="text-teal-400">Show</span> lung opacity"</li>
                <li>"<span className="text-teal-400">Detect</span> nodule"</li>
                <li>"<span className="text-teal-400">Look for</span> effusion"</li>
              </ul>
            </div>

            {/* Quick buttons */}
            <div className="mt-4">
              <p className="text-xs text-white/50 mb-2">Or tap to analyze:</p>
              <div className="flex flex-wrap gap-2">
                {['fracture', 'tumor', 'nodule', 'opacity', 'effusion'].map((term) => (
                  <button
                    key={term}
                    onClick={() => runAnalysis(term)}
                    disabled={!imageFile || isAnalyzing}
                    className="px-3 py-1.5 text-sm bg-white/10 hover:bg-teal-500/30 border border-white/10 hover:border-teal-500/50 rounded-lg text-white/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
