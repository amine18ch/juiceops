'use client';
import { useState, useRef, useCallback } from 'react';

export type VoiceError =
  | 'not-supported' |'not-allowed' |'no-speech' |'network' |'aborted' |'unknown';

export interface UseVoiceTranscriptionOptions {
  lang?: string;
  onTranscript?: (text: string) => void;
  onError?: (error: VoiceError, message: string) => void;
}

export interface UseVoiceTranscriptionReturn {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  errorMessage: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  resetTranscript: () => void;
}

export function useVoiceTranscription(
  options: UseVoiceTranscriptionOptions = {}
): UseVoiceTranscriptionReturn {
  const { lang = 'fr-FR', onTranscript, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      let msg =
        'La reconnaissance vocale n\'est pas supportée par ce navigateur. Utilisez Chrome ou Edge, ou saisissez le texte manuellement.';
      setErrorMessage(msg);
      onError?.('not-supported', msg);
      return;
    }

    setErrorMessage(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionAPI() as any;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setErrorMessage(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        }
      }
      if (finalText) {
        setTranscript((prev) => {
          const updated = (prev + finalText).trim();
          onTranscript?.(updated);
          return updated;
        });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      let errorType: VoiceError = 'unknown';
      let msg = '';

      switch (event.error) {
        case 'not-allowed': case'permission-denied':
          errorType = 'not-allowed';
          msg =
            'Accès au microphone refusé. Autorisez le microphone dans les paramètres du navigateur, puis réessayez.';
          break;
        case 'no-speech':
          errorType = 'no-speech';
          msg = 'Aucune parole détectée. Parlez plus fort ou rapprochez-vous du microphone.';
          break;
        case 'network':
          errorType = 'network';
          msg =
            'Erreur réseau lors de la reconnaissance vocale. Vérifiez votre connexion ou saisissez le texte manuellement.';
          break;
        case 'aborted':
          errorType = 'aborted';
          msg = 'Enregistrement interrompu.';
          break;
        default:
          errorType = 'unknown';
          msg = `Erreur de reconnaissance vocale (${event.error}). Saisissez le texte manuellement si le problème persiste.`;
      }

      setErrorMessage(msg);
      onError?.(errorType, msg);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      let msg = 'Impossible de démarrer la reconnaissance vocale. Réessayez ou saisissez le texte manuellement.';
      setErrorMessage(msg);
      onError?.('unknown', msg);
    }
  }, [isSupported, lang, onTranscript, onError]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setErrorMessage(null);
  }, []);

  return {
    isRecording,
    isSupported,
    transcript,
    errorMessage,
    startRecording,
    stopRecording,
    toggleRecording,
    resetTranscript,
  };
}
