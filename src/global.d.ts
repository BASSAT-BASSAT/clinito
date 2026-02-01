/**
 * Shared global type extensions (Window + Web Speech API) so multiple files don't declare conflicting types.
 */
declare global {
  interface Window {
    botpress?: {
      on?: (event: string, callback: (data: unknown) => void) => void;
      sendMessage?: (text: string) => void;
      sendEvent?: (event: { type: string; payload?: unknown }) => void;
      open?: () => void;
      close?: () => void;
      toggle?: () => void;
    };
    botpressWebChat?: {
      init?: (config: unknown) => void;
      sendEvent?: (event: unknown) => void;
      onEvent?: (callback: (event: unknown) => void) => void;
      open?: () => void;
    };
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }

  interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
}

export {};
