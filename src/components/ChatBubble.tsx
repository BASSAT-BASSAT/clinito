'use client';

import { useAuth } from '@/components/AuthProvider';
import { MessageCircle } from 'lucide-react';

/**
 * Persistent floating chat bubble (like the old Botpress pop-up).
 * Shown when the doctor is logged in; click opens the Botpress webchat.
 */
export function ChatBubble() {
  const { doctor } = useAuth();

  const openChat = () => {
    if (typeof window === 'undefined') return;
    (window.botpress?.open ?? (window.botpressWebChat as { open?: () => void })?.open)?.();
  };

  if (!doctor) return null;

  return (
    <button
      type="button"
      onClick={openChat}
      className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-700 hover:shadow-xl hover:shadow-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
      aria-label="Open chat"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
