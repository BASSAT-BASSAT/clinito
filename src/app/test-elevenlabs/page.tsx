'use client';

import { useState, useRef } from 'react';

export default function TestElevenLabsPage() {
  const [ttsStatus, setTtsStatus] = useState('Not tested');
  const [sttStatus, setSttStatus] = useState('Not tested');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Test TTS
  const testTTS = async () => {
    setTtsStatus('⏳ Testing TTS...');
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello! ElevenLabs text to speech is working correctly.' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();
        setTtsStatus('✅ TTS Working! You should hear audio.');
      } else {
        const errorText = await response.text();
        setTtsStatus(`❌ TTS Failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      setTtsStatus(`❌ TTS Error: ${(error as Error).message}`);
    }
  };

  // Test STT
  const startRecording = async () => {
    setSttStatus('⏳ Starting recording...');
    
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
        
        setSttStatus(`⏳ Sending ${audioBlob.size} bytes to ElevenLabs STT...`);
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          
          if (response.ok) {
            const data = await response.json();
            setTranscript(data.text || '(empty)');
            setSttStatus(`✅ STT Working! Transcript: "${data.text || '(empty)'}"`);
          } else {
            const errorText = await response.text();
            setSttStatus(`❌ STT Failed: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          setSttStatus(`❌ STT Error: ${(error as Error).message}`);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setSttStatus('🎤 Recording... Click Stop when done');
    } catch (error) {
      setSttStatus(`❌ Microphone Error: ${(error as Error).message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">🧪 ElevenLabs API Test</h1>
        
        {/* TTS Test */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">🔊 Text-to-Speech (TTS)</h2>
          <button
            onClick={testTTS}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Test TTS
          </button>
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="font-mono text-sm">{ttsStatus}</p>
          </div>
        </div>

        {/* STT Test */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">🎤 Speech-to-Text (STT)</h2>
          <div className="flex gap-4">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Stop Recording
            </button>
          </div>
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="font-mono text-sm">{sttStatus}</p>
          </div>
          {transcript && (
            <div className="mt-4 p-4 bg-green-900/50 rounded-lg">
              <p className="text-sm text-green-300">Transcript: {transcript}</p>
            </div>
          )}
        </div>

        {/* API Key Info */}
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Troubleshooting</h2>
          <ul className="text-sm text-yellow-200/80 space-y-2">
            <li>• Make sure <code className="bg-gray-800 px-1 rounded">.env.local</code> has your API key</li>
            <li>• Check if ElevenLabs free tier is not blocked</li>
            <li>• Try using a VPN if getting "unusual activity" error</li>
            <li>• Check terminal for detailed error messages</li>
          </ul>
        </div>

        {/* Links */}
        <div className="text-center space-x-4">
          <a href="/" className="text-blue-400 hover:underline">← Home</a>
          <a href="/voice-analysis" className="text-blue-400 hover:underline">Voice Analysis →</a>
        </div>
      </div>
    </div>
  );
}
