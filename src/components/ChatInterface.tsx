'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Volume2, VolumeX, Bot, User, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export function ChatInterface({ messages, onSendMessage, isProcessing }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const playAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setPlayingAudio(null);
    audioRef.current.play();
    setPlayingAudio(audioUrl);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              onSendMessage(data.text);
            }
          }
        } catch (error) {
          console.error('STT error:', error);
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onSendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-medical-bg flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-medical-muted" />
            </div>
            <h3 className="text-medical-text font-medium mb-2">Medical Assistant Ready</h3>
            <p className="text-sm text-medical-muted max-w-sm">Upload an image and run analysis, then ask me questions about the findings.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex gap-3 animate-fade-in ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${message.role === 'user' ? 'bg-medical-primary' : 'bg-gradient-to-br from-medical-primary to-medical-accent'}`}>
                {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-medical-primary text-white rounded-tr-sm' : 'bg-medical-bg border border-medical-border text-medical-text rounded-tl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.role === 'assistant' && message.audioUrl && (
                  <button onClick={() => playAudio(message.audioUrl!)} className="mt-2 flex items-center gap-1.5 text-xs text-medical-accent hover:text-medical-accent/80 transition-colors">
                    {playingAudio === message.audioUrl ? <><VolumeX className="w-3.5 h-3.5" /><span>Stop</span></> : <><Volume2 className="w-3.5 h-3.5" /><span>Listen</span></>}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isProcessing && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-medical-primary to-medical-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-medical-bg border border-medical-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-medical-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-medical-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-medical-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the analysis..." disabled={isProcessing || isRecording} className="flex-1 px-4 py-3 bg-medical-bg border border-medical-border rounded-xl text-medical-text placeholder-medical-muted focus:outline-none focus:border-medical-accent focus:ring-1 focus:ring-medical-accent/50 disabled:opacity-50 transition-all" />
        <button 
          type="button" 
          onClick={toggleRecording} 
          disabled={isProcessing || isTranscribing} 
          className={`relative px-4 py-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-medical-bg border border-medical-border hover:border-medical-accent text-medical-muted hover:text-medical-accent'} disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? 'Stop recording' : 'Push to talk'}
        >
          {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button type="submit" disabled={!input.trim() || isProcessing} className="px-4 py-3 bg-medical-primary hover:bg-medical-secondary text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
