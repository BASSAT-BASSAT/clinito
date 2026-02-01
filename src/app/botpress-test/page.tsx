'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, VolumeX, Stethoscope, MessageCircle } from 'lucide-react';

export default function BotpressVoicePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [status, setStatus] = useState('Initializing Botpress...');
  const [lastMessage, setLastMessage] = useState('');
  const [botpressReady, setBotpressReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize Botpress and hook into events
  useEffect(() => {
    // Load Botpress scripts
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.botpress.cloud/webchat/v3.5/inject.js';
    script1.async = true;
    document.body.appendChild(script1);

    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://files.bpcontent.cloud/2026/01/23/09/20260123091128-V0WNET1N.js';
      script2.defer = true;
      document.body.appendChild(script2);

      script2.onload = () => {
        setBotpressReady(true);
        setStatus('Ready - Click mic to speak');
        
        // Open chat by default after a short delay
        setTimeout(() => {
          if (window.botpress?.open) {
            window.botpress.open();
          }
        }, 1500);
      };
    };

    // Listen for postMessage events from Botpress iframe
    const handleBotpressMessage = (event: MessageEvent) => {
      // Check if it's from Botpress
      if (event.origin.includes('botpress') || event.data?.type?.includes('botpress')) {
        console.log('Botpress event:', event.data);
      }
      
      // Handle different message formats from Botpress
      const data = event.data;
      
      // Format 1: Direct message
      if (data?.text && typeof data.text === 'string' && data.type !== 'user') {
        handleBotResponse(data.text);
      }
      
      // Format 2: Payload wrapper
      if (data?.payload?.text && data.direction !== 'outgoing') {
        handleBotResponse(data.payload.text);
      }
      
      // Format 3: Webchat event
      if (data?.type === 'webchat:message' && data?.message?.text) {
        handleBotResponse(data.message.text);
      }
    };

    window.addEventListener('message', handleBotpressMessage);

    // Also use MutationObserver to watch for new messages in the DOM
    const observeBotpressChat = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Look for bot message elements
              const botMessages = node.querySelectorAll('[class*="bot"], [class*="Bot"], [data-role="bot"]');
              botMessages.forEach((msg) => {
                const text = msg.textContent?.trim();
                if (text && text.length > 0) {
                  handleBotResponse(text);
                }
              });
            }
          });
        });
      });

      // Observe the entire document for Botpress iframe content changes
      observer.observe(document.body, { childList: true, subtree: true });
      
      return observer;
    };

    const observer = observeBotpressChat();

    return () => {
      window.removeEventListener('message', handleBotpressMessage);
      observer.disconnect();
      document.querySelectorAll('script[src*="botpress"]').forEach(s => s.remove());
    };
  }, []);

  // Track last spoken message to avoid duplicates
  const lastSpokenRef = useRef<string>('');
  
  // Handle bot response - speak it with TTS
  const handleBotResponse = useCallback((text: string) => {
    if (!text || text.length < 2) return;
    
    // Avoid duplicates
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    
    console.log('Bot response:', text);
    setLastMessage(text);
    
    if (autoSpeak) {
      queueSpeech(text);
    }
  }, [autoSpeak]);

  // Queue speech to handle multiple messages
  const queueSpeech = (text: string) => {
    audioQueueRef.current.push(text);
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      setStatus('Ready - Click mic to speak');
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const text = audioQueueRef.current.shift()!;
    await speakText(text);
  };

  // Text-to-Speech with ElevenLabs
  const speakText = async (text: string): Promise<void> => {
    if (!text.trim()) {
      playNextInQueue();
      return;
    }
    
    setStatus('🔊 Speaking...');
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        return new Promise((resolve) => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
            playNextInQueue();
          };
          audioRef.current.onerror = () => {
            resolve();
            playNextInQueue();
          };
          audioRef.current.play().catch(() => {
            resolve();
            playNextInQueue();
          });
        });
      } else {
        console.error('TTS failed');
        playNextInQueue();
      }
    } catch (error) {
      console.error('TTS error:', error);
      playNextInQueue();
    }
  };

  const stopSpeaking = () => {
    audioQueueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setStatus('Ready - Click mic to speak');
  };

  // Speech-to-Text with ElevenLabs
  const startRecording = useCallback(async () => {
    // Stop any playing audio first
    stopSpeaking();
    
    console.log('Starting recording...');
    setStatus('🎤 Requesting microphone...');
    
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('❌ Microphone not supported in this browser');
        alert('Microphone access is not supported. Please use Chrome, Firefox, or Edge.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Got audio stream:', stream);
      
      // Try different MIME types
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = ''; // Let browser choose
        }
      }
      console.log('Using MIME type:', mimeType || 'default');
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        console.log('Data available:', e.data.size);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, chunks:', chunksRef.current.length);
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        console.log('Audio blob size:', audioBlob.size);
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioBlob.size < 1000) {
          setStatus('Recording too short - try again');
          return;
        }
        
        setIsTranscribing(true);
        setStatus('🎯 Transcribing...');
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          console.log('Sending to STT API...');
          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          console.log('STT response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('STT result:', data);
            if (data.text && data.text.trim()) {
              setStatus('📤 Sending to assistant...');
              sendToBotpress(data.text.trim());
            } else {
              setStatus('No speech detected - try again');
            }
          } else {
            const errorText = await response.text();
            console.error('STT error response:', errorText);
            setStatus('Transcription failed - check console');
          }
        } catch (error) {
          console.error('STT error:', error);
          setStatus('Error - check console');
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setStatus('Recording error');
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setStatus('🎤 Recording... Click to stop');
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      if ((error as Error).name === 'NotAllowedError') {
        setStatus('❌ Microphone permission denied');
        alert('Please allow microphone access in your browser settings.');
      } else if ((error as Error).name === 'NotFoundError') {
        setStatus('❌ No microphone found');
        alert('No microphone detected. Please connect a microphone.');
      } else {
        setStatus(`❌ Error: ${(error as Error).message}`);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    console.log('Toggle recording clicked, isRecording:', isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Send message to Botpress
  const sendToBotpress = (text: string) => {
    if (window.botpress?.sendMessage) {
      try {
        window.botpress.sendMessage(text);
        setStatus('✅ Sent! Waiting for response...');
      } catch (error) {
        console.error('Botpress send error:', error);
        fallbackSendToBotpress(text);
      }
    } else {
      fallbackSendToBotpress(text);
    }
  };

  // Fallback: Simulate input in the Botpress iframe
  const fallbackSendToBotpress = (text: string) => {
    // Try to find and interact with Botpress input
    const sendViaDOM = () => {
      // Method 1: Try to find the input directly
      const inputs = Array.from(document.querySelectorAll('input[placeholder], textarea'));
      for (const input of inputs) {
        const el = input as HTMLInputElement;
        if (el.placeholder?.toLowerCase().includes('type') || el.placeholder?.toLowerCase().includes('message')) {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Find and click send button
          const parent = el.closest('form') || el.parentElement?.parentElement;
          const button = parent?.querySelector('button[type="submit"], button:last-child');
          if (button) {
            (button as HTMLButtonElement).click();
            setStatus('✅ Sent! Waiting for response...');
            return true;
          }
        }
      }
      return false;
    };

    // Try immediately and after a delay
    if (!sendViaDOM()) {
      setTimeout(() => {
        if (!sendViaDOM()) {
          setStatus('Type in the chat widget to continue');
        }
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/25">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MedAssist AI</h1>
                <p className="text-xs text-teal-400/80">Botpress + ElevenLabs Voice</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className={`w-2 h-2 rounded-full ${botpressReady ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="text-xs text-white/70">{botpressReady ? 'Connected' : 'Connecting...'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-6 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          
          {/* Voice Control Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            
            {/* Status Display */}
            <div className="mb-8 p-4 bg-black/30 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isSpeaking ? 'bg-orange-500/20' : isRecording ? 'bg-red-500/20' : 'bg-teal-500/20'}`}>
                  {isSpeaking ? <Volume2 className="w-4 h-4 text-orange-400 animate-pulse" /> : 
                   isRecording ? <Mic className="w-4 h-4 text-red-400 animate-pulse" /> :
                   <MessageCircle className="w-4 h-4 text-teal-400" />}
                </div>
                <p className="text-sm text-white font-medium">{status}</p>
              </div>
              {lastMessage && (
                <p className="mt-3 text-xs text-white/50 line-clamp-2">
                  Last response: "{lastMessage.slice(0, 100)}{lastMessage.length > 100 ? '...' : ''}"
                </p>
              )}
            </div>

            {/* Main Mic Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={`relative w-28 h-28 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isRecording 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/50' 
                    : isTranscribing
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-2xl shadow-amber-500/50'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-2xl shadow-teal-500/40 hover:shadow-teal-500/60'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {/* Pulse ring when recording */}
                {isRecording && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                    <span className="absolute inset-2 rounded-full bg-red-400 animate-ping opacity-30" style={{ animationDelay: '0.2s' }} />
                  </>
                )}
                
                {/* Icon */}
                <div className="relative z-10">
                  {isTranscribing ? (
                    <Loader2 className="w-10 h-10 text-white mx-auto animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-10 h-10 text-white mx-auto" />
                  ) : (
                    <Mic className="w-10 h-10 text-white mx-auto" />
                  )}
                </div>
              </button>

              {/* Button Label */}
              <p className="mt-4 text-sm text-white/60">
                {isRecording ? 'Tap to stop' : isTranscribing ? 'Processing...' : 'Tap to speak'}
              </p>

              {/* Stop Speaking Button */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-full transition-all"
                >
                  <VolumeX className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-300">Stop Speaking</span>
                </button>
              )}

              {/* Speak Last Response Button */}
              {lastMessage && !isSpeaking && (
                <button
                  onClick={() => queueSpeech(lastMessage)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 rounded-full transition-all"
                >
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-teal-300">Speak Last Response</span>
                </button>
              )}
            </div>

            {/* Auto-speak Toggle */}
            <div className="mt-8 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-teal-400" />
                  <span className="text-sm font-medium text-white">
                    Auto-speak responses
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(e) => setAutoSpeak(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-7 bg-white/20 rounded-full peer peer-checked:bg-teal-500 transition-colors" />
                  <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
              <p className="mt-2 text-xs text-white/50">
                {autoSpeak ? '🔊 Bot responses will be spoken aloud' : '🔇 Bot responses will be silent'}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-teal-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🎯</span> How to use
            </h3>
            <ol className="text-sm text-white/60 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 font-mono">1.</span>
                <span>Tap the mic button and speak your question</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 font-mono">2.</span>
                <span>ElevenLabs transcribes your voice to text</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 font-mono">3.</span>
                <span>Your message is sent to the Botpress assistant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 font-mono">4.</span>
                <span>The response is read aloud via ElevenLabs TTS</span>
              </li>
            </ol>
          </div>

          {/* Hint */}
          <p className="text-center text-white/40 text-sm flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat widget is in the bottom-right corner
          </p>
        </div>
      </main>
    </div>
  );
}
