'use client';

import React from 'react';
import { ClinitoHeader } from '@/components/ClinitoHeader';

type AppShellProps = {
  /** Page subtitle shown in header (e.g. "Patients", "Settings") */
  subtitle?: string;
  /** Right-side header content (buttons, links) */
  rightContent?: React.ReactNode;
  /** Back link on the left (e.g. "/home", "/patients") */
  backHref?: string;
  /** Main content */
  children: React.ReactNode;
  /** Optional mobile bottom navigation */
  bottomNav?: React.ReactNode;
  /** Max width of main content (default max-w-4xl) */
  maxWidth?: 'max-w-4xl' | 'max-w-5xl' | 'max-w-lg' | 'max-w-6xl' | 'max-w-7xl';
  /** Extra class for main content wrapper */
  mainClassName?: string;
};

export function AppShell({
  subtitle,
  rightContent,
  backHref,
  children,
  bottomNav,
  maxWidth = 'max-w-4xl',
  mainClassName = '',
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50 text-slate-900">
      <ClinitoHeader
        subtitle={subtitle}
        rightContent={rightContent}
        backHref={backHref}
        variant="light"
      />
      <main className={`${maxWidth} mx-auto px-4 py-4 pb-24 ${mainClassName}`.trim()}>
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
