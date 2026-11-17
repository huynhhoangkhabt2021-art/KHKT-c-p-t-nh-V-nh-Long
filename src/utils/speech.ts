export function speakVietnamese(
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };
    utterance.onend = () => {
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      options?.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options?.onEnd?.();
    return false;
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancel errors
    }
  }
}

export interface SpeechRecognitionHandle {
  stop: () => void;
}

export function startVietnameseListening(callbacks: {
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): SpeechRecognitionHandle | null {
  if (typeof window === 'undefined') return null;

  const win = window as unknown as {
    SpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    webkitSpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
  };

  const RecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!RecognitionClass) {
    callbacks.onError('Trình duyệt hiện tại chưa hỗ trợ micro tiếng Việt. Bác hãy gõ hoặc chọn câu hỏi gợi ý bên dưới.');
    return null;
  }

  try {
    const recognition = new RecognitionClass();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        callbacks.onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        callbacks.onError('Chưa cấp quyền Micro. Bác vui lòng bấm nút gợi ý hoặc nhập câu hỏi bên dưới.');
      } else {
        callbacks.onError('Chưa nghe rõ giọng nói. Bác có thể bấm thử lại hoặc chọn câu hỏi gợi ý.');
      }
    };

    recognition.onend = () => {
      callbacks.onEnd();
    };

    recognition.start();
    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch {
    callbacks.onError('Không thể khởi động micro. Bác hãy chọn câu hỏi gợi ý bên dưới.');
    return null;
  }
}
