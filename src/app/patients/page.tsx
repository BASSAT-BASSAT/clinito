'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Link from 'next/link';
import { 
  Users, UserPlus, Search, ArrowLeft, Phone, 
  Calendar, Droplets, AlertCircle, FileText, ChevronRight,
  X, Cloud, CheckCircle
} from 'lucide-react';

// Declare Botpress types
declare global {
  interface Window {
    botpress?: {
      sendEvent: (event: { type: string; payload?: any }) => void;
    };
  }
}

export default function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  // Convex queries
  const patients = useQuery(api.patients.getAllPatients);
  const searchResults = useQuery(
    api.patients.searchPatients,
    searchTerm ? { searchTerm } : 'skip'
  );
  const portfolio = useQuery(
    api.patients.getPatientPortfolio,
    selectedPatient ? { patientId: selectedPatient } : 'skip'
  );

  // Convex mutations
  const createPatient = useMutation(api.patients.createPatient);

  const displayPatients = searchTerm && searchResults ? searchResults : patients;

  // Store patient context when a patient is selected
  useEffect(() => {
    if (portfolio) {
      const patientContext = {
        name: `${portfolio.patient.firstName} ${portfolio.patient.lastName}`,
        id: portfolio.patient.patientId,
        gender: portfolio.patient.gender,
        bloodType: portfolio.patient.bloodType || 'Unknown',
        allergies: portfolio.patient.allergies?.join(', ') || 'None',
        medicalHistory: portfolio.patient.medicalHistory || 'No prior history',
        recentMedications: portfolio.medications?.map((m: any) => m.name).join(', ') || 'None',
      };

      // Store in localStorage for the PatientContextBanner
      localStorage.setItem('currentPatient', JSON.stringify(patientContext));
      
      // Dispatch custom event for immediate update
      window.dispatchEvent(new CustomEvent('patientContextChange', { detail: patientContext }));

      // Also try to send to Botpress if available
      if (window.botpress) {
        window.botpress.sendEvent({
          type: 'patient-context',
          payload: patientContext,
        });
      }

      console.log('Patient context stored:', patientContext);
    }
  }, [portfolio]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    phone: '',
    email: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        bloodType: formData.bloodType || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : undefined,
        medicalHistory: formData.medicalHistory || undefined,
      });
      setShowAddForm(false);
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        phone: '',
        email: '',
        bloodType: '',
        allergies: '',
        medicalHistory: '',
      });
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] noise">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Patient Records</h1>
                  <p className="text-sm text-white/40">Manage patient portfolios</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <Cloud className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Synced with Convex</span>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Add Patient
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients by name or ID..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">
              {searchTerm ? 'Search Results' : 'All Patients'} 
              <span className="text-white/40 ml-2">({displayPatients?.length || 0})</span>
            </h2>

            {patients === undefined ? (
              <div className="p-8 text-center text-white/40 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                <p>Loading patients...</p>
              </div>
            ) : displayPatients?.length === 0 ? (
              <div className="p-8 text-center text-white/40 bg-white/5 rounded-xl border border-white/5">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No patients found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Add your first patient
                </button>
              </div>
            ) : (
              displayPatients?.map((patient) => (
                <button
                  key={patient.patientId}
                  onClick={() => setSelectedPatient(patient.patientId)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedPatient === patient.patientId
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-white/40">{patient.patientId}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                        <span className="capitalize">{patient.gender}</span>
                        <span>•</span>
                        <span>DOB: {patient.dateOfBirth}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Patient Portfolio */}
          <div className="lg:col-span-2">
            {!selectedPatient ? (
              <div className="p-12 text-center text-white/40 bg-white/5 rounded-2xl border border-white/5">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a patient to view their portfolio</p>
              </div>
            ) : portfolio === undefined ? (
              <div className="p-12 text-center text-white/40 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                <p>Loading patient data...</p>
              </div>
            ) : portfolio ? (
              <div className="space-y-6">
                {/* Patient Info Card */}
                <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {portfolio.patient.firstName} {portfolio.patient.lastName}
                      </h2>
                      <p className="text-white/40">{portfolio.patient.patientId}</p>
                    </div>
                    <Link
                      href="/?tab=analyze"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Analyze Image
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Date of Birth
                      </div>
                      <p className="text-white">{portfolio.patient.dateOfBirth}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
                        <Users className="w-4 h-4" />
                        Gender
                      </div>
                      <p className="text-white capitalize">{portfolio.patient.gender}</p>
                    </div>
                    {portfolio.patient.bloodType && (
                      <div className="p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
                          <Droplets className="w-4 h-4" />
                          Blood Type
                        </div>
                        <p className="text-white">{portfolio.patient.bloodType}</p>
                      </div>
                    )}
                    {portfolio.patient.phone && (
                      <div className="p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
                          <Phone className="w-4 h-4" />
                          Phone
                        </div>
                        <p className="text-white">{portfolio.patient.phone}</p>
                      </div>
                    )}
                  </div>

                  {portfolio.patient.allergies && portfolio.patient.allergies.length > 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Allergies
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {portfolio.patient.allergies.map((allergy, i) => (
                          <span key={i} className="px-2 py-1 bg-red-500/20 rounded text-red-300 text-sm">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {portfolio.patient.medicalHistory && (
                    <div className="mt-4 p-3 bg-white/5 rounded-xl">
                      <div className="text-white/40 text-sm mb-2">Medical History</div>
                      <p className="text-white/80 text-sm">{portfolio.patient.medicalHistory}</p>
                    </div>
                  )}
                </div>

                {/* Visit History */}
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    Visit History ({portfolio.sessions.length})
                  </h3>
                  {portfolio.sessions.length === 0 ? (
                    <p className="text-white/40 text-center py-4">No visits recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.sessions.slice(0, 5).map((session) => (
                        <div key={session.sessionId} className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">
                                {new Date(session.visitDate).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-white/40">
                                {session.chiefComplaint || 'General consultation'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              session.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400'
                                : session.status === 'ongoing'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          {session.segmentationResult && (
                            <p className="mt-2 text-sm text-white/60">
                              Analysis: {session.segmentationResult}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Medications ({portfolio.medications.length})
                  </h3>
                  {portfolio.medications.length === 0 ? (
                    <p className="text-white/40 text-center py-4">No medications prescribed</p>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.medications.slice(0, 5).map((med) => (
                        <div key={med.medicationId} className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{med.drugName}</p>
                              <p className="text-sm text-white/60">
                                {med.dosage} • {med.frequency} • {med.duration}
                              </p>
                              {med.instructions && (
                                <p className="text-xs text-white/40 mt-1">{med.instructions}</p>
                              )}
                            </div>
                            <p className="text-xs text-white/30">
                              {new Date(med.prescribedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summaries */}
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Visit Summaries ({portfolio.summaries.length})
                  </h3>
                  {portfolio.summaries.length === 0 ? (
                    <p className="text-white/40 text-center py-4">No summaries recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.summaries.slice(0, 3).map((summary) => (
                        <div key={summary.summaryId} className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-medium">{summary.diagnosis}</p>
                            <p className="text-xs text-white/30">
                              {new Date(summary.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-white/60">{summary.findings}</p>
                          {summary.recommendations && (
                            <p className="text-sm text-cyan-400/80 mt-2">
                              Recommendations: {summary.recommendations}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-white/40 bg-white/5 rounded-2xl border border-white/5">
                <p>Patient not found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#12121a] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add New Patient</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                    className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="male" className="bg-[#1a1a2e] text-white">Male</option>
                    <option value="female" className="bg-[#1a1a2e] text-white">Female</option>
                    <option value="other" className="bg-[#1a1a2e] text-white">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Blood Type</label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="" className="bg-[#1a1a2e] text-white/50">Select...</option>
                    <option value="A+" className="bg-[#1a1a2e] text-white">A+</option>
                    <option value="A-" className="bg-[#1a1a2e] text-white">A-</option>
                    <option value="B+" className="bg-[#1a1a2e] text-white">B+</option>
                    <option value="B-" className="bg-[#1a1a2e] text-white">B-</option>
                    <option value="AB+" className="bg-[#1a1a2e] text-white">AB+</option>
                    <option value="AB-" className="bg-[#1a1a2e] text-white">AB-</option>
                    <option value="O+" className="bg-[#1a1a2e] text-white">O+</option>
                    <option value="O-" className="bg-[#1a1a2e] text-white">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Allergies (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Penicillin, Peanuts..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Medical History</label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
