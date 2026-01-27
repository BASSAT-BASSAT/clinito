'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Building2, Plus, Trash2, Edit2, Check, X, 
  User, LogOut, Home, Users
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export default function SettingsPage() {
  const { doctor, logout } = useAuth();
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', type: 'clinic' as 'clinic' | 'hospital' | 'other' });
  const [newClinic, setNewClinic] = useState({ 
    name: '', 
    type: 'clinic' as 'clinic' | 'hospital' | 'other', 
    address: '', 
    phone: '' 
  });

  // Get doctor ID
  const doctorId = doctor?.id as Id<"doctors"> | undefined;

  // Convex queries
  const clinics = useQuery(
    api.clinics.getDoctorClinics,
    doctorId ? { doctorId } : "skip"
  ) || [];

  // Convex mutations
  const createClinic = useMutation(api.clinics.createClinic);
  const updateClinic = useMutation(api.clinics.updateClinic);
  const deleteClinicMutation = useMutation(api.clinics.deleteClinic);

  const handleAddClinic = async () => {
    if (!newClinic.name.trim() || !doctorId) return;
    
    try {
      await createClinic({
        doctorId,
        name: newClinic.name.trim(),
        type: newClinic.type,
        address: newClinic.address || undefined,
        phone: newClinic.phone || undefined,
      });
      
      setNewClinic({ name: '', type: 'clinic', address: '', phone: '' });
      setShowAddClinic(false);
    } catch (error) {
      console.error('Error creating clinic:', error);
      alert('Failed to create clinic');
    }
  };

  const handleUpdateClinic = async (clinicId: Id<"clinics">) => {
    if (!editData.name.trim()) return;
    
    try {
      await updateClinic({
        clinicId,
        name: editData.name.trim(),
        type: editData.type,
      });
      
      setEditingClinic(null);
      setEditData({ name: '', type: 'clinic' });
    } catch (error) {
      console.error('Error updating clinic:', error);
      alert('Failed to update clinic');
    }
  };

  const handleDeleteClinic = async (clinicId: Id<"clinics">) => {
    if (clinics.length <= 1) {
      alert('You must have at least one clinic');
      return;
    }
    
    try {
      await deleteClinicMutation({ clinicId });
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      alert(error.message || 'Failed to delete clinic');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-bold text-gray-800">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Profile
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {doctor?.firstName?.[0]}{doctor?.lastName?.[0]}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Dr. {doctor?.firstName} {doctor?.lastName}</h3>
                <p className="text-sm text-gray-500">{doctor?.email}</p>
                {doctor?.specialization && (
                  <p className="text-xs text-blue-600 mt-1">{doctor.specialization}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Clinics Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              My Clinics & Hospitals
            </h2>
            <button
              onClick={() => setShowAddClinic(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          
          {clinics.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No clinics yet</p>
              <button
                onClick={() => setShowAddClinic(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Add Your First Clinic
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {clinics.map((clinic: any) => (
                <div key={clinic._id} className="p-4 flex items-center justify-between">
                  {editingClinic === clinic._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800"
                        autoFocus
                      />
                      <select
                        value={editData.type}
                        onChange={(e) => setEditData({ ...editData, type: e.target.value as any })}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800"
                      >
                        <option value="clinic">Clinic</option>
                        <option value="hospital">Hospital</option>
                        <option value="other">Other</option>
                      </select>
                      <button
                        onClick={() => handleUpdateClinic(clinic._id)}
                        className="p-2 bg-blue-600 text-white rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingClinic(null); setEditData({ name: '', type: 'clinic' }); }}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-medium text-gray-800">{clinic.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{clinic.type}</p>
                        {clinic.address && (
                          <p className="text-xs text-gray-400 mt-1">{clinic.address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { 
                            setEditingClinic(clinic._id); 
                            setEditData({ name: clinic.name, type: clinic.type }); 
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteClinic(clinic._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Privacy Info */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-700 text-center">
            Your patients and data are private and only visible to you.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium hover:bg-red-100 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </main>

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setShowAddClinic(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add Clinic / Hospital</h3>
              <button onClick={() => setShowAddClinic(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  placeholder="e.g., City Hospital"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={newClinic.type}
                  onChange={(e) => setNewClinic({ ...newClinic, type: e.target.value as any })}
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
                  value={newClinic.address}
                  onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                  placeholder="Enter address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClinic.phone}
                  onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                  placeholder="Enter phone"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddClinic(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClinic}
                  disabled={!newClinic.name.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Add Clinic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden safe-bottom">
        <div className="flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/patients" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <Users className="w-5 h-5" />
            <span className="text-xs">Patients</span>
          </Link>
          <button className="flex flex-col items-center gap-1 p-2 text-blue-600">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
