'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Mic, MicOff, Loader2, Upload, X, Brain, Scan, 
  Stethoscope, Activity, Zap, Shield, ChevronRight,
  Volume2, VolumeX, Sparkles, Heart, Eye, Users
} from 'lucide-react';
import Link from 'next/link';

// Declare SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function HomeContent() {
  const searchParams = useSearchParams();
  
  // States
  const [activeTab, setActiveTab] = useState<'home' | 'analyze'>('home');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [maskOpacity, setMaskOpacity] = useState(0.6);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check URL params for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'analyze') {
      setActiveTab('analyze');
    }
  }, [searchParams]);

  useEffect(() => {
    imageFileRef.current = imageFile;
  }, [imageFile]);

  // Analysis keywords
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

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setMaskUrl(null);
      setAnalysisResult(null);
      setConfidence(0);
      setStatus('Image loaded. Say "highlight [condition]" or tap a quick option.');
      setActiveTab('analyze');
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setMaskUrl(null);
    setAnalysisResult(null);
    setConfidence(0);
    setStatus('Ready');
  };

  // SAM Analysis
  const runAnalysis = async (prompt: string) => {
    const currentImageFile = imageFileRef.current;
    if (!currentImageFile) {
      speakText("Upload image first doctor.");
      return;
    }

    setIsAnalyzing(true);
    setStatus(`Analyzing for "${prompt}"...`);

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
        setConfidence(result.confidence || 0.5);
        setStatus('Analysis complete');
        speakText(`Done doctor. ${prompt} detected. ${Math.round((result.confidence || 0.5) * 100)} percent.`);
      } else {
        setStatus('Analysis failed');
        speakText("Analysis failed doctor.");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Error');
      speakText("Error doctor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // TTS
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setIsSpeaking(true);

    // Try ElevenLabs first
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
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // STT
  const handleTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    const analysisTarget = parseAnalysisCommand(transcript);
    if (analysisTarget) {
      await runAnalysis(analysisTarget);
    } else {
      setStatus(`Heard: "${transcript}"`);
      speakText("Say highlight, then what to find.");
    }
  }, []);

  const startRecording = useCallback(() => {
    stopSpeaking();
    if (!imageFileRef.current) {
      speakText("Upload image first doctor.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakText("Use Chrome doctor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('Listening...');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setIsTranscribing(true);
      await handleTranscript(transcript);
      setIsTranscribing(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setStatus('Error - try again');
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleTranscript]);

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  // Features data
  const features = [
    { icon: Brain, title: 'AI Analysis', desc: 'Medical-SAM3 segmentation' },
    { icon: Mic, title: 'Voice Control', desc: 'Speak your commands' },
    { icon: Shield, title: 'HIPAA Ready', desc: 'Secure processing' },
    { icon: Zap, title: 'Real-time', desc: 'Instant results' },
  ];

  const quickAnalysis = ['fracture', 'tumor', 'nodule', 'opacity', 'effusion', 'mass'];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur-lg opacity-50" />
                <div className="relative p-2.5 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  CLINITO
                </h1>
                <p className="text-[10px] text-emerald-400/80 font-medium tracking-wider">AI MEDICAL ASSISTANT</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'home' 
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('analyze')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'analyze' 
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Analyze
              </button>
              <Link
                href="/patients"
                className="px-5 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Patients
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isSpeaking && (
                <button 
                  onClick={stopSpeaking}
                  className="p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-all"
                >
                  <VolumeX className="w-5 h-5 text-orange-400" />
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">
        {activeTab === 'home' ? (
          /* ===== HOME TAB ===== */
          <div className="max-w-7xl mx-auto px-6">
            {/* Hero Section */}
            <section className="py-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Powered by Medical-SAM3 & AI Voice</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                  Medical Imaging
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Reimagined
                </span>
              </h1>
              
              <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
                Upload medical images and use voice commands to detect fractures, tumors, 
                nodules, and more. Instant AI-powered analysis at your fingertips.
              </p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setActiveTab('analyze')}
                  className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl font-semibold text-white shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Start Analysis
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('analyze')}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold text-white hover:bg-white/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </section>

            {/* Features Grid */}
            <section className="py-16">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {features.map((feature, i) => (
                  <div 
                    key={i}
                    className="group p-6 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/40">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it Works */}
            <section className="py-16">
              <h2 className="text-3xl font-bold text-center mb-12">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  How It Works
                </span>
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: '01', icon: Upload, title: 'Upload Image', desc: 'Upload X-ray, CT, or MRI scans' },
                  { step: '02', icon: Mic, title: 'Voice Command', desc: 'Say "highlight fracture" or similar' },
                  { step: '03', icon: Eye, title: 'View Results', desc: 'See highlighted areas with confidence' },
                ].map((item, i) => (
                  <div key={i} className="relative p-8 bg-white/5 border border-white/10 rounded-3xl">
                    <span className="absolute -top-4 left-8 text-5xl font-bold text-emerald-500/20">{item.step}</span>
                    <item.icon className="w-10 h-10 text-emerald-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/50">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* ===== ANALYZE TAB ===== */
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Left: Image Panel */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Scan className="w-5 h-5 text-emerald-400" />
                      </div>
                      Medical Image
                    </h2>
                    {imagePreview && (
                      <button
                        onClick={clearImage}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>

                  {!imagePreview ? (
                    <label className="relative border-2 border-dashed border-white/20 rounded-2xl p-16 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform pointer-events-none">
                        <Upload className="w-10 h-10 text-emerald-400" />
                      </div>
                      <p className="text-lg font-medium text-white/70 mb-2 pointer-events-none">Drop your image here</p>
                      <p className="text-sm text-white/40 pointer-events-none">or click to browse</p>
                      <p className="text-xs text-white/30 mt-4 pointer-events-none">Supports X-ray, CT, MRI</p>
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                        <img
                          src={imagePreview}
                          alt="Medical scan"
                          className="w-full h-full object-contain"
                        />
                        {maskUrl && (
                          <img
                            src={maskUrl}
                            alt="Mask"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                            style={{ opacity: maskOpacity }}
                          />
                        )}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="text-center">
                              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                              <p className="text-emerald-400 font-medium">Analyzing...</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {maskUrl && (
                        <div className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/60">Mask Opacity</span>
                            <span className="text-sm text-emerald-400">{Math.round(maskOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={maskOpacity}
                            onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Analysis Result */}
                {analysisResult && (
                  <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <Heart className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-semibold">Analysis Result</h3>
                    </div>
                    <p className="text-white/70 text-sm mb-4">{analysisResult}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 font-semibold">{Math.round(confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Voice Control Panel */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Brain className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-semibold">Voice Commands</h2>
                  </div>

                  {/* Status */}
                  <div className="p-4 bg-black/30 rounded-xl mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isRecording ? 'bg-red-500 animate-pulse' : 
                        isAnalyzing ? 'bg-yellow-500 animate-pulse' : 
                        'bg-emerald-500'
                      }`} />
                      <p className="text-sm text-white/70">{status}</p>
                    </div>
                  </div>

                  {/* Mic Button */}
                  <div className="flex flex-col items-center py-8">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing || isAnalyzing || !imageFile}
                      className={`relative w-32 h-32 rounded-full transition-all duration-300 ${
                        isRecording
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/40'
                          : !imageFile
                          ? 'bg-white/10 cursor-not-allowed'
                          : 'bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105'
                      } disabled:opacity-50`}
                    >
                      {isRecording && (
                        <>
                          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                          <span className="absolute inset-4 rounded-full bg-red-400 animate-ping opacity-30" style={{ animationDelay: '0.2s' }} />
                        </>
                      )}
                      <div className="relative z-10">
                        {isTranscribing || isAnalyzing ? (
                          <Loader2 className="w-12 h-12 text-white mx-auto animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="w-12 h-12 text-white mx-auto" />
                        ) : (
                          <Mic className="w-12 h-12 text-white mx-auto" />
                        )}
                      </div>
                    </button>
                    <p className="mt-4 text-sm text-white/50">
                      {!imageFile ? 'Upload image first' : isRecording ? 'Listening... Tap to stop' : 'Tap to speak'}
                    </p>
                  </div>

                  {/* Quick Options */}
                  <div className="space-y-4">
                    <p className="text-sm text-white/40 text-center">Or tap to analyze:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {quickAnalysis.map((term) => (
                        <button
                          key={term}
                          onClick={() => runAnalysis(term)}
                          disabled={!imageFile || isAnalyzing}
                          className="px-4 py-3 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed capitalize"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Voice Commands Help */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Example Commands
                  </h3>
                  <div className="space-y-2">
                    {[
                      '"Highlight fracture"',
                      '"Find tumor"',
                      '"Show lung opacity"',
                      '"Detect nodule"',
                    ].map((cmd, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <ChevronRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-white/60">{cmd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/30">© 2026 CLINITO. For research purposes only.</p>
            <p className="text-sm text-white/30">⚠️ Not for clinical diagnosis</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
