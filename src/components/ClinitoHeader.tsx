'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Stethoscope, ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

type ClinitoHeaderProps = {
  title?: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  /** Light = white app shell, Dark = glassy dark shell */
  variant?: 'light' | 'dark';
  /** Optional back link on the far left */
  backHref?: string;
};

export function ClinitoHeader({
  title = 'Clinito AI',
  subtitle,
  rightContent,
  variant = 'light',
  backHref,
}: ClinitoHeaderProps) {
  const { doctor } = useAuth();

  const isDark = variant === 'dark';

  const openChat = () => {
    if (typeof window !== 'undefined') {
      (window.botpress?.open ?? (window.botpressWebChat as { open?: () => void })?.open)?.();
    }
  };

  const wrapperClasses = isDark
    ? 'sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur'
    : 'sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur shadow-sm';

  const innerClasses = 'max-w-5xl mx-auto px-4 py-3 flex items-center justify-between';

  return (
    <header className={wrapperClasses}>
      <div className={innerClasses}>
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white/80'
                  : 'bg-sky-50/80 hover:bg-sky-100 text-sky-700 border border-sky-100'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
          )}

          <div className="relative w-9 h-9 rounded-xl overflow-hidden border bg-white shadow-sm border-sky-100">
            <Image
              src="/logoclinito.png"
              alt="Clinito AI logo"
              fill
              sizes="36px"
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span
              className={`font-bold text-sm md:text-base ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {title}
            </span>
            {subtitle ? (
              <span className={`text-[11px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {subtitle}
              </span>
            ) : doctor ? (
              <span className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Dr. {doctor.firstName} {doctor.lastName}
              </span>
            ) : (
              <span
                className={`flex items-center gap-1 text-[11px] ${
                  isDark ? 'text-white/50' : 'text-gray-500'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Medical AI Copilot
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {doctor && (
            <button
              type="button"
              onClick={openChat}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white/80'
                  : 'bg-sky-50/80 hover:bg-sky-100 text-sky-700 border border-sky-100'
              }`}
              aria-label="Open chat"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium hidden sm:inline">Chat</span>
            </button>
          )}
          {rightContent}
        </div>
      </div>
    </header>
  );
}

