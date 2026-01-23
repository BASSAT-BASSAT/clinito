'use client';

import { useState, useCallback } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { SegmentationViewer } from '@/components/SegmentationViewer';
import { ChatInterface } from '@/components/ChatInterface';
import { VoiceControls } from '@/components/VoiceControls';
import { Disclaimer } from '@/components/Disclaimer';
import { Header } from '@/components/Header';
import { Activity, Brain, Scan, MessageSquare } from 'lucide-react';

interface SegmentationResult {
  maskUrl: string;
  description: string;
  confidence: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  const handleImageUpload = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSegmentationResult(null);
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile || !textPrompt.trim()) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', textPrompt);
      const response = await fetch('/api/sam3/segment', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Segmentation failed');
      const result = await response.json();
      setSegmentationResult({
        maskUrl: result.mask_url,
        description: result.description,
        confidence: result.confidence,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I've analyzed the image for "${textPrompt}". ${result.description} (Confidence: ${Math.round(result.confidence * 100)}%)`,
        },
      ]);
    } catch (error) {
      console.error('Analysis error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error analyzing the image. Please try again.' },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setIsProcessingChat(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: segmentationResult?.description || '',
          history: messages,
        }),
      });
      const data = await response.json();
      const audioUrl = await generateTTS(data.response);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response, audioUrl }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I apologize, but I encountered an error processing your question. Please try again.' },
      ]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  const generateTTS = async (text: string): Promise<string | undefined> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return undefined;
    }
  };

  const handleVoiceInput = (transcript: string) => {
    handleSendMessage(transcript);
  };

  return (
    <div className="min-h-screen bg-medical-bg bg-mesh">
      <Disclaimer />
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-6 mb-6 p-4 bg-medical-card/50 rounded-xl border border-medical-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-medical-accent" />
            <span className="text-sm text-medical-muted">System Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-medical-accent" />
            <span className="text-sm text-medical-muted">SAM 3 Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-medical-accent" />
            <span className="text-sm text-medical-muted">{imageFile ? 'Image Loaded' : 'No Image'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-medical-accent" />
            <span className="text-sm text-medical-muted">{messages.length} Messages</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-medical-card rounded-2xl border border-medical-border p-6 glow-teal">
              <h2 className="text-lg font-semibold text-medical-text mb-4 flex items-center gap-2">
                <Scan className="w-5 h-5 text-medical-accent" />
                Medical Image Analysis
              </h2>
              {!imagePreview ? (
                <ImageUpload onUpload={handleImageUpload} />
              ) : (
                <SegmentationViewer
                  imageUrl={imagePreview}
                  maskUrl={segmentationResult?.maskUrl}
                  onReset={() => { setImageFile(null); setImagePreview(null); setSegmentationResult(null); }}
                />
              )}
            </div>
            {imagePreview && (
              <div className="bg-medical-card rounded-2xl border border-medical-border p-6 animate-fade-in">
                <h3 className="text-md font-medium text-medical-text mb-4">What should I look for?</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="e.g., lung opacity, fracture, lesion..."
                    className="flex-1 px-4 py-3 bg-medical-bg border border-medical-border rounded-xl text-medical-text placeholder-medical-muted focus:outline-none focus:border-medical-accent focus:ring-1 focus:ring-medical-accent/50 transition-all"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !textPrompt.trim()}
                    className="px-6 py-3 bg-medical-primary hover:bg-medical-secondary text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</>
                    ) : (
                      <><Brain className="w-4 h-4" />Analyze</>
                    )}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['lung opacity', 'fracture', 'mass', 'nodule', 'effusion'].map((prompt) => (
                    <button key={prompt} onClick={() => setTextPrompt(prompt)} className="px-3 py-1.5 text-sm bg-medical-bg border border-medical-border rounded-lg text-medical-muted hover:text-medical-text hover:border-medical-accent transition-all">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {segmentationResult && (
              <div className="bg-medical-card rounded-2xl border border-medical-border p-6 animate-slide-up">
                <h3 className="text-md font-medium text-medical-text mb-3">Analysis Result</h3>
                <p className="text-medical-muted mb-2">{segmentationResult.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-medical-muted">Confidence:</span>
                  <div className="flex-1 h-2 bg-medical-bg rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-medical-primary to-medical-accent transition-all duration-500" style={{ width: `${segmentationResult.confidence * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-medical-accent">{Math.round(segmentationResult.confidence * 100)}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-medical-card rounded-2xl border border-medical-border p-6 h-[600px] flex flex-col glow-teal">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-medical-text flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-medical-accent" />
                  Medical Assistant
                </h2>
                <VoiceControls onTranscript={handleVoiceInput} />
              </div>
              <ChatInterface messages={messages} onSendMessage={handleSendMessage} isProcessing={isProcessingChat} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
