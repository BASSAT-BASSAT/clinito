'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Link from 'next/link';
import { 
  ArrowLeft, Mic, MicOff, Upload, X, Brain, Stethoscope,
  FileText, Pill, Save, CheckCircle, User, Volume2
} from 'lucide-react';

function SessionContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patient');

  // Convex
  const patient = useQuery(
    api.patients.getPatient,
    patientId ? { patientId } : 'skip'
  );
  const createSession = useMutation(api.sessions.createSession);
  const updateSessionAnalysis = useMutation(api.sessions.updateSessionAnalysis);
  const completeSession = useMutation(api.sessions.completeSession);
  const createSummary = useMutation(api.summaries.createSummary);
  const addMedication = useMutation(api.medications.addMedication);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);

  // Image analysis state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisConfidence, setAnalysisConfidence] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const imageFileRef = useRef<File | null>(null);

  // Summary form
  const [showSummaryForm, setShowSummaryForm] = useState(false);
  const [summaryData, setSummaryData] = useState({
    diagnosis: '',
    findings: '',
    recommendations: '',
    followUpDate: '',
    doctorNotes: '',
  });

  // Medications form
  const [showMedForm, setShowMedForm] = useState(false);
  const [medications, setMedications] = useState<Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>([]);
  const [currentMed, setCurrentMed] = useState({
    drugName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  useEffect(() => {
    imageFileRef.current = imageFile;
  }, [imageFile]);

  // Start session
  const startSession = async () => {
    if (!patientId) return;
    try {
      const id = await createSession({
        patientId,
        chiefComplaint: chiefComplaint || undefined,
      });
      setSessionId(id);
      setSessionStarted(true);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // Image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      setMaskUrl(null);
      setAnalysisResult(null);
    }
  }, []);

  // Run SAM analysis
  const runAnalysis = async (prompt: string) => {
    const currentFile = imageFileRef.current;
    if (!currentFile || !prompt.trim()) return;

    setIsAnalyzing(true);
    setStatus(`Analyzing for "${prompt}"...`);

    try {
      const formData = new FormData();
      formData.append('image', currentFile);
      formData.append('prompt', prompt);

      const response = await fetch('/api/sam3/segment', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setMaskUrl(result.mask_url);
        setAnalysisResult(result.description);
        setAnalysisConfidence(result.confidence);
        setStatus('Analysis complete');

        // Update session in database
        if (sessionId) {
          await updateSessionAnalysis({
            sessionId,
            segmentationPrompt: prompt,
            segmentationResult: result.description,
            segmentationConfidence: result.confidence,
          });
        }

        // Auto-fill summary findings
        setSummaryData(prev => ({
          ...prev,
          findings: result.description,
        }));

        speakText(`Done doctor. ${prompt} detected. ${Math.round(result.confidence * 100)} percent.`);
      } else {
        setStatus('Analysis failed');
        speakText('Analysis failed doctor.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // TTS
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await processAudio(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Listening...');
    } catch (error) {
      console.error('Mic error:', error);
      setStatus('Mic access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing...');
    }
  };

  const processAudio = async (blob: Blob) => {
    // Try browser speech recognition as fallback
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        handleTranscript(transcript);
      };

      recognition.onerror = () => {
        setStatus('Speech recognition failed');
      };

      recognition.start();
      // Play the blob to trigger recognition
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {});
    }
  };

  const handleTranscript = (transcript: string) => {
    setStatus(`Heard: "${transcript}"`);
    const lower = transcript.toLowerCase();

    // Parse commands
    if (lower.includes('highlight') || lower.includes('find') || lower.includes('detect') || lower.includes('show')) {
      const words = lower.split(' ');
      const idx = words.findIndex(w => ['highlight', 'find', 'detect', 'show'].includes(w));
      if (idx !== -1 && idx < words.length - 1) {
        const target = words.slice(idx + 1).join(' ');
        setTextPrompt(target);
        runAnalysis(target);
      }
    }
  };

  // Add medication to list
  const addMedToList = () => {
    if (currentMed.drugName && currentMed.dosage) {
      setMedications([...medications, currentMed]);
      setCurrentMed({
        drugName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    }
  };

  // Complete session
  const handleCompleteSession = async () => {
    if (!sessionId || !patientId) return;

    try {
      // Save summary
      if (summaryData.diagnosis && summaryData.findings) {
        await createSummary({
          sessionId,
          patientId,
          diagnosis: summaryData.diagnosis,
          findings: summaryData.findings,
          recommendations: summaryData.recommendations || undefined,
          followUpDate: summaryData.followUpDate || undefined,
          doctorNotes: summaryData.doctorNotes || undefined,
        });
      }

      // Save medications
      for (const med of medications) {
        await addMedication({
          sessionId,
          patientId,
          drugName: med.drugName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions || undefined,
        });
      }

      // Complete session
      await completeSession({ sessionId });

      speakText('Session completed doctor.');
      setStatus('Session completed');
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  if (!patientId) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] noise flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">No patient selected</p>
          <Link href="/patients" className="text-cyan-400 hover:text-cyan-300">
            Go to Patients →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] noise">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/patients" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Patient Session</h1>
                  {patient && (
                    <p className="text-sm text-white/40">
                      {patient.firstName} {patient.lastName} • {patient.patientId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm ${
                sessionStarted ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {sessionStarted ? 'Session Active' : 'Not Started'}
              </span>
              {sessionStarted && (
                <button
                  onClick={() => setShowSummaryForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Save className="w-4 h-4" />
                  Complete Session
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!sessionStarted ? (
          /* Start Session Form */
          <div className="max-w-xl mx-auto">
            <div className="p-8 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Start New Session
              </h2>
              {patient && (
                <p className="text-center text-white/40 mb-6">
                  Patient: {patient.firstName} {patient.lastName}
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Chief Complaint</label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="What brings the patient in today?"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
                <button
                  onClick={startSession}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Begin Session
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Session */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image Analysis */}
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  Image Analysis
                </h3>

                {!imagePreview ? (
                  <label className="block p-12 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-white/30" />
                    <p className="text-white/60">Click or drag to upload image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Medical scan"
                      className="w-full rounded-xl"
                    />
                    {maskUrl && (
                      <img
                        src={maskUrl}
                        alt="Segmentation mask"
                        className="absolute inset-0 w-full h-full rounded-xl opacity-60"
                        style={{ mixBlendMode: 'screen' }}
                      />
                    )}
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setMaskUrl(null);
                      }}
                      className="absolute top-3 right-3 p-2 bg-black/50 rounded-lg hover:bg-black/70"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {imagePreview && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="What to look for..."
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                      />
                      <button
                        onClick={() => runAnalysis(textPrompt)}
                        disabled={isAnalyzing || !textPrompt.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium disabled:opacity-50"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {['fracture', 'tumor', 'opacity', 'nodule', 'mass'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setTextPrompt(p)}
                          className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:border-white/30"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult && (
                  <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                    <p className="text-white">{analysisResult}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-white/40">Confidence:</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${(analysisConfidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-cyan-400">
                        {Math.round((analysisConfidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Control */}
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                  Voice Commands
                </h3>
                <p className="text-sm text-white/40 mb-4">
                  Say: &quot;Highlight fracture&quot; or &quot;Find tumor&quot;
                </p>

                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`w-full py-6 rounded-xl font-medium text-lg transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90'
                  }`}
                >
                  {isRecording ? (
                    <span className="flex items-center justify-center gap-2">
                      <MicOff className="w-6 h-6" />
                      Release to Stop
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Mic className="w-6 h-6" />
                      Hold to Speak
                    </span>
                  )}
                </button>
                <p className="text-center text-sm text-white/40 mt-3">{status}</p>
              </div>
            </div>

            {/* Right: Medications */}
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-green-400" />
                  Prescriptions
                </h3>

                {medications.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {medications.map((med, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{med.drugName}</p>
                          <p className="text-sm text-white/60">
                            {med.dosage} • {med.frequency} • {med.duration}
                          </p>
                        </div>
                        <button
                          onClick={() => setMedications(medications.filter((_, j) => j !== i))}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <X className="w-4 h-4 text-white/40" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowMedForm(!showMedForm)}
                  className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/60 hover:text-white hover:border-white/40 transition-colors"
                >
                  + Add Medication
                </button>

                {showMedForm && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Drug name"
                        value={currentMed.drugName}
                        onChange={(e) => setCurrentMed({ ...currentMed, drugName: e.target.value })}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g., 500mg)"
                        value={currentMed.dosage}
                        onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Frequency (e.g., twice daily)"
                        value={currentMed.frequency}
                        onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g., 7 days)"
                        value={currentMed.duration}
                        onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Instructions (e.g., take with food)"
                      value={currentMed.instructions}
                      onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={addMedToList}
                      className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                    >
                      Add to Prescription
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Notes */}
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Session Notes
                </h3>
                <textarea
                  value={summaryData.doctorNotes}
                  onChange={(e) => setSummaryData({ ...summaryData, doctorNotes: e.target.value })}
                  placeholder="Add notes during the session..."
                  rows={5}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Complete Session Modal */}
      {showSummaryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#12121a] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Complete Session
              </h2>
              <button
                onClick={() => setShowSummaryForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Diagnosis *</label>
                <input
                  type="text"
                  value={summaryData.diagnosis}
                  onChange={(e) => setSummaryData({ ...summaryData, diagnosis: e.target.value })}
                  placeholder="Primary diagnosis"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Findings *</label>
                <textarea
                  value={summaryData.findings}
                  onChange={(e) => setSummaryData({ ...summaryData, findings: e.target.value })}
                  placeholder="Clinical findings and observations"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Recommendations</label>
                <textarea
                  value={summaryData.recommendations}
                  onChange={(e) => setSummaryData({ ...summaryData, recommendations: e.target.value })}
                  placeholder="Treatment recommendations"
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Follow-up Date</label>
                <input
                  type="date"
                  value={summaryData.followUpDate}
                  onChange={(e) => setSummaryData({ ...summaryData, followUpDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {medications.length > 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 font-medium mb-2">
                    Medications to prescribe ({medications.length})
                  </p>
                  <ul className="text-sm text-white/60 space-y-1">
                    {medications.map((med, i) => (
                      <li key={i}>• {med.drugName} {med.dosage}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSummaryForm(false)}
                  className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
                >
                  Continue Session
                </button>
                <button
                  onClick={handleCompleteSession}
                  disabled={!summaryData.diagnosis || !summaryData.findings}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Complete & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
