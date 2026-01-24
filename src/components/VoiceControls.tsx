'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
}

export function VoiceControls({ onTranscript }: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          if (response.ok) {
            const data = await response.json();
            if (data.text) onTranscript(data.text);
          }
        } catch (error) {
          console.error('STT error:', error);
        } finally {
          setIsProcessing(false);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onTranscript]);

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
    <button onClick={toggleRecording} disabled={isProcessing} className={`relative p-3 rounded-xl transition-all ${isRecording ? 'bg-medical-danger text-white' : isProcessing ? 'bg-medical-bg text-medical-muted' : 'bg-medical-bg hover:bg-medical-border text-medical-muted hover:text-medical-text'}`} title={isRecording ? 'Stop recording' : 'Start voice input'}>
      {isRecording && <div className="absolute inset-0 rounded-xl bg-medical-danger/50 animate-pulse-ring" />}
      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
