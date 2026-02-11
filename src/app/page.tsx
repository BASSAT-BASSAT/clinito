'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Brain, Image as ImageIcon, Mic, Users, Mail, MessageCircle, LogOut, Clock } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function LandingPage() {
  const { doctor, isApprovedUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-sky-200 bg-white shadow-sm flex-shrink-0">
              <Image
                src="/logoclinito.png"
                alt="Clinito AI"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Clinito AI</p>
              <p className="text-[11px] text-slate-500">Your diagnostic copilot</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {doctor ? (
              isApprovedUser ? (
                <>
                  <Link
                    href="/home"
                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl border border-sky-200 text-sm text-sky-700 hover:bg-sky-50 transition font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/home"
                    className="inline-flex items-center px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
                  >
                    Go to dashboard
                  </Link>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline-flex items-center px-3 py-2 text-xs text-slate-600">
                    Hi, {doctor.firstName}
                  </span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl border border-sky-200 text-sm text-sky-700 hover:bg-sky-50 transition font-medium"
                >
                  Doctor portal
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2.5 rounded-xl border border-sky-300 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50 transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-xs font-medium text-sky-700 mb-6">
              <Brain className="w-3.5 h-3.5" />
              Medical image copilot for clinicians
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Hi — this is{' '}
              <span className="bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
                Clinito
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              We help doctors segment medical images with AI. Upload a study, describe what you care about in plain language or by voice, and get precise overlays in seconds. No clicking through menus — say or type what you think, and we highlight it.
            </p>
            
            {/* Show pending access banner for logged-in non-approved users */}
            {doctor && !isApprovedUser && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Account Created Successfully!</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Hi {doctor.firstName}, thanks for signing up! Access to Clinito features is currently limited to our team during the beta phase. 
                      Contact us via the details below if you&apos;d like early access.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!doctor ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-sky-300 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50 transition"
                  >
                    Sign up / Create account
                  </Link>
                </>
              ) : isApprovedUser ? (
                <Link
                  href="/home"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
                >
                  Go to dashboard
                </Link>
              ) : null}
            </div>
            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600 max-w-md">
              <div>
                <dt className="font-semibold text-slate-700 mb-1">Modalities</dt>
                <dd>CT, X-ray, MRI, US, endoscopy</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 mb-1">Interaction</dt>
                <dd>Text prompts & voice</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 mb-1">Collaboration</dt>
                <dd>Patients, clinics & notes</dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden bg-white border border-sky-100 shadow-xl">
              <Image
                src="/hero-medical-sam3.png"
                alt="Medical-SAM3 segmentation overview"
                width={640}
                height={360}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Info / How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-sky-100">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
          How Clinito fits your workflow
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mb-10">
          From image upload to patient follow-up, Clinito keeps everything in one place — with Medical-SAM3 handling the vision work.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: '1. Upload', icon: ImageIcon, text: 'Drop a CT, X-ray, MRI or ultrasound image from PACS or your desktop.' },
            { title: '2. Describe', icon: Mic, text: 'Type or say what to highlight — e.g. lung nodule, fracture, mass.' },
            { title: '3. Segment', icon: Brain, text: 'Medical-SAM3 returns a precise overlay with confidence and basic measurements.' },
            { title: '4. Communicate', icon: Users, text: 'Attach findings to patients, send secure summaries, or trigger follow-ups.' },
          ].map(({ title, icon: Icon, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50 border border-sky-100">
                  <Icon className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-sky-100">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Contact Us</h2>
        <p className="text-sm text-slate-600 max-w-xl mb-8">
          Questions, feedback, or want to try Clinito in your clinic? Get in touch with our co-founders.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Mohamed */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900 mb-2">Mohamed Bassat</p>
            <p className="text-xs text-sky-600 mb-1">Co-Founder</p>
            <a
              href="mailto:mohamed77bassat@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <Mail className="w-4 h-4" />
              mohamed77bassat@gmail.com
            </a>
            <a
              href="https://wa.me/201140093909"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <MessageCircle className="w-4 h-4" />
              +20 11 40093909
            </a>
          </div>
          {/* Seif */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900 mb-2">Seif Amgad</p>
            <p className="text-xs text-sky-600 mb-1">Co-Founder</p>
            <a
              href="mailto:seifamgad447@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <Mail className="w-4 h-4" />
              seifamgad447@gmail.com
            </a>
            <a
              href="https://wa.me/201203899393"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <MessageCircle className="w-4 h-4" />
              +20 12 03899393
            </a>
          </div>
          {/* Omar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900 mb-2">Omar Mahmoud</p>
            <p className="text-xs text-sky-600 mb-1">Co-Founder</p>
            <a
              href="mailto:omarmahmoudahmed2222005@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <Mail className="w-4 h-4" />
              omarmahmoudahmed2222005@gmail.com
            </a>
            <a
              href="https://wa.me/201060842338"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition"
            >
              <MessageCircle className="w-4 h-4" />
              +20 10 60842338
            </a>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-sky-100 bg-sky-50/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {doctor && !isApprovedUser ? 'Interested in early access?' : 'Ready to try it?'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {doctor && !isApprovedUser 
                ? 'Contact us via WhatsApp or email above to request access.'
                : 'Sign in to access the doctor portal and start segmenting.'
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!doctor ? (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
                >
                  Open doctor portal
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-sm text-sky-700 font-medium hover:bg-sky-50 transition"
                >
                  Sign in
                </Link>
              </>
            ) : isApprovedUser ? (
              <Link
                href="/home"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
              >
                Go to dashboard
              </Link>
            ) : (
              <a
                href="https://wa.me/201140093909"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:bg-sky-700 transition"
              >
                <MessageCircle className="w-4 h-4" />
                Contact us on WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
