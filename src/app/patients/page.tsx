'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, UserPlus, Search, ArrowLeft, Phone, Mail,
  Calendar, Droplets, AlertCircle, ChevronRight, X, Trash2,
  MessageCircle, Camera, Home, Building2, Plus, Settings
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export default function PatientsPage() {
  const { doctor } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState<any>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('all');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Get doctor ID from auth
  const doctorId = doctor?.id as Id<"doctors"> | undefined;

  // Convex queries - ONLY get this doctor's patients
  const doctorPatients = useQuery(
    api.patients.getPatientsByDoctor,
    doctorId ? { doctorId } : "skip"
  ) || [];

  // Get this doctor's clinics
  const doctorClinics = useQuery(
    api.clinics.getDoctorClinics,
    doctorId ? { doctorId } : "skip"
  ) || [];
  
  // Convex mutations
  const createPatient = useMutation(api.patients.createPatient);
  const deletePatientMutation = useMutation(api.patients.deletePatient);
  const createClinic = useMutation(api.clinics.createClinic);

  // Filter patients by search and clinic
  const filteredPatients = doctorPatients.filter((p: any) => {
    // Filter by clinic
    if (selectedClinicFilter !== 'all') {
      if (p.clinicId !== selectedClinicFilter) return false;
    }
    
    // Filter by search
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (p.phone || '').includes(searchTerm) ||
      p.patientId.toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    );
  });

  // Get clinic name by ID
  const getClinicName = (clinicId: string) => {
    const clinic = doctorClinics.find((c: any) => c._id === clinicId);
    return clinic?.name || 'Unknown';
  };

  // Delete patient
  const handleDelete = async (patientId: string) => {
    try {
      await deletePatientMutation({ patientId });
      setShowDeleteConfirm(null);
      if (selectedPatient?.patientId === patientId) {
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient');
    }
  };

  // Send WhatsApp
  const sendWhatsApp = async (patient: any) => {
    if (!patient.phone) {
      alert('Patient has no phone number');
      return;
    }
    const message = encodeURIComponent(
      contactMessage || `Hello ${patient.firstName}, this is Dr. ${doctor?.firstName} from Clinito.`
    );
    const phone = patient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowContactModal(null);
    setContactMessage('');
  };

  // Send Email
  const sendEmail = async (patient: any) => {
    if (!patient.email) {
      alert('Patient has no email');
      return;
    }
    const subject = encodeURIComponent(`Message from Dr. ${doctor?.firstName} ${doctor?.lastName}`);
    const body = encodeURIComponent(
      contactMessage || `Hello ${patient.firstName}, this is Dr. ${doctor?.firstName} from Clinito.`
    );
    window.open(`mailto:${patient.email}?subject=${subject}&body=${body}`, '_blank');
    setShowContactModal(null);
    setContactMessage('');
  };

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
    clinicId: '',
  });

  const [newClinicData, setNewClinicData] = useState({
    name: '',
    type: 'clinic' as 'clinic' | 'hospital' | 'other',
    address: '',
    phone: '',
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPatientImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Add new clinic
  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;

    try {
      const clinicId = await createClinic({
        doctorId,
        name: newClinicData.name,
        type: newClinicData.type,
        address: newClinicData.address || undefined,
        phone: newClinicData.phone || undefined,
      });
      
      setFormData({ ...formData, clinicId: clinicId });
      setShowAddClinic(false);
      setNewClinicData({ name: '', type: 'clinic', address: '', phone: '' });
    } catch (error) {
      console.error('Error creating clinic:', error);
      alert('Failed to create clinic');
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) {
      alert('Please login first');
      return;
    }
    
    try {
      await createPatient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth || new Date().toISOString().split('T')[0],
        gender: formData.gender,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        bloodType: formData.bloodType || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : undefined,
        medicalHistory: formData.medicalHistory || undefined,
        doctorId: doctorId,
        clinicId: formData.clinicId ? formData.clinicId as Id<"clinics"> : undefined,
      });
      
      setShowAddForm(false);
      setPatientImage(null);
      setFormData({
        firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
        phone: '', email: '', bloodType: '', allergies: '', medicalHistory: '', clinicId: '',
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient. Please try again.');
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setPatientImage(null);
    setFormData({
      firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
      phone: '', email: '', bloodType: '', allergies: '', medicalHistory: '', clinicId: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/home" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="font-bold text-gray-800">My Patients</h1>
                <p className="text-xs text-gray-500">{filteredPatients.length} patients</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </Link>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Add Patient</span>
              </button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {doctorClinics.length > 0 && (
              <select
                value={selectedClinicFilter}
                onChange={(e) => setSelectedClinicFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm"
              >
                <option value="all">All Clinics</option>
                {doctorClinics.map((clinic: any) => (
                  <option key={clinic._id} value={clinic._id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Patient List */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {doctorPatients.length === 0 ? 'No patients yet' : 'No patients found'}
            </h3>
            <p className="text-gray-400 mb-6">
              {doctorPatients.length === 0 
                ? 'Add your first patient to get started'
                : 'Try a different search or filter'}
            </p>
            {doctorPatients.length === 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
              >
                Add Patient
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.map((patient: any) => (
              <div
                key={patient._id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div
                  onClick={() => setSelectedPatient(selectedPatient?._id === patient._id ? null : patient)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{patient.phone || patient.email || 'No contact'}</span>
                          {patient.clinicId && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {getClinicName(patient.clinicId)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${selectedPatient?._id === patient._id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedPatient?._id === patient._id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                    {/* Clinic Badge */}
                    {patient.clinicId && (
                      <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
                        <Building2 className="w-4 h-4" />
                        {getClinicName(patient.clinicId)}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-gray-500">DOB</p>
                        <p className="text-sm font-medium text-gray-800">{patient.dateOfBirth || 'N/A'}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                        <Users className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-gray-500">Gender</p>
                        <p className="text-sm font-medium text-gray-800 capitalize">{patient.gender}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                        <Droplets className="w-4 h-4 mx-auto mb-1 text-red-500" />
                        <p className="text-xs text-gray-500">Blood</p>
                        <p className="text-sm font-medium text-gray-800">{patient.bloodType || 'N/A'}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl border border-gray-100">
                        <Mail className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{patient.email || 'N/A'}</p>
                      </div>
                    </div>

                    {patient.allergies && patient.allergies.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
                          <AlertCircle className="w-4 h-4" />
                          Allergies
                        </div>
                        <p className="text-sm text-red-700">{patient.allergies.join(', ')}</p>
                      </div>
                    )}

                    {patient.medicalHistory && (
                      <div className="mb-4 p-3 bg-white border border-gray-100 rounded-xl">
                        <p className="text-xs text-gray-500 font-medium mb-1">Medical History</p>
                        <p className="text-sm text-gray-700">{patient.medicalHistory}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowContactModal(patient)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(patient.patientId)}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={resetForm}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h2 className="font-bold text-gray-800 text-lg">Add New Patient</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="p-4 space-y-4">
              {/* Patient Photo */}
              <div className="flex justify-center">
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition overflow-hidden border-2 border-dashed border-gray-300"
                >
                  {patientImage ? (
                    <img src={patientImage} alt="Patient" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-6 h-6 mx-auto text-gray-400" />
                      <p className="text-xs text-gray-400 mt-1">Photo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Clinic/Hospital Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Clinic / Hospital *
                </label>
                <div className="flex gap-2">
                  <select
                    required
                    value={formData.clinicId}
                    onChange={(e) => setFormData({ ...formData, clinicId: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  >
                    <option value="">Select where patient comes from</option>
                    {doctorClinics.map((clinic: any) => (
                      <option key={clinic._id} value={clinic._id}>
                        {clinic.name} ({clinic.type})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddClinic(true)}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                    title="Add new clinic"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {doctorClinics.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Please add a clinic first before adding patients
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                <select
                  value={formData.bloodType}
                  onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Separate with commas"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.clinicId}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowAddClinic(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add New Clinic/Hospital</h3>
              <button onClick={() => setShowAddClinic(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddClinic} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newClinicData.name}
                  onChange={(e) => setNewClinicData({ ...newClinicData, name: e.target.value })}
                  placeholder="e.g., City Hospital"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={newClinicData.type}
                  onChange={(e) => setNewClinicData({ ...newClinicData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                >
                  <option value="clinic">Clinic</option>
                  <option value="hospital">Hospital</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newClinicData.address}
                  onChange={(e) => setNewClinicData({ ...newClinicData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClinicData.phone}
                  onChange={(e) => setNewClinicData({ ...newClinicData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddClinic(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium"
                >
                  Add Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Patient?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete the patient and all their records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => { setShowContactModal(null); setContactMessage(''); }}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Contact {showContactModal.firstName}</h3>
              <button onClick={() => { setShowContactModal(null); setContactMessage(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => sendWhatsApp(showContactModal)}
                  disabled={!showContactModal.phone}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => sendEmail(showContactModal)}
                  disabled={!showContactModal.email}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden safe-bottom">
        <div className="flex justify-around py-2">
          <Link href="/home" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <button className="flex flex-col items-center gap-1 p-2 text-blue-600">
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Patients</span>
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex flex-col items-center gap-1 p-2 text-gray-400"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-xs">Add</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
