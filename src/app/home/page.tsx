'use client';

import Link from 'next/link';
import { Brain, Users, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ClinitoHeader } from '@/components/ClinitoHeader';

export default function HomePage() {
  const { doctor, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50 text-slate-900">
      <ClinitoHeader
        subtitle="Home"
        rightContent={
          <>
            <Link
              href="/settings"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-200 text-sm text-sky-700 hover:bg-sky-50 transition"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Log out</span>
            </button>
          </>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-10 pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back{doctor ? `, Dr. ${doctor.firstName}` : ''}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose where to go next.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/app"
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-50 border border-sky-100">
                <Brain className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Workstation</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Segment images with Medical-SAM3
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/patients"
            className="group rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-50 border border-sky-100">
                <Users className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Patients</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Manage your patients and clinics
                </p>
              </div>
            </div>
          </Link>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-sky-100 sm:hidden safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around py-2">
          <Link href="/home" className="flex flex-col items-center gap-1 p-2 text-sky-600">
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/app" className="flex flex-col items-center gap-1 p-2 text-slate-500">
            <Brain className="w-5 h-5" />
            <span className="text-xs">Workstation</span>
          </Link>
          <Link href="/patients" className="flex flex-col items-center gap-1 p-2 text-slate-500">
            <Users className="w-5 h-5" />
            <span className="text-xs">Patients</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
