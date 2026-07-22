type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechErrorEvent = { error?: string };

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult?: (event: SpeechResultEvent) => void;
  onerror?: (event: SpeechErrorEvent) => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor() {
  return (window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).SpeechRecognition ?? (window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).webkitSpeechRecognition;
}

export function supportsVoiceInput() {
  return typeof window !== "undefined" && Boolean(speechRecognitionConstructor());
}

export function startVoiceInput({ onTranscript, onEnd, onError }: {
  onTranscript: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}) {
  const Recognition = speechRecognitionConstructor();
  if (!Recognition) throw new Error("Voice input is not supported in this browser");
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onTranscript(transcript);
  };
  recognition.onerror = (event) => onError(event.error || "Voice input failed");
  recognition.onend = onEnd;
  recognition.start();
  return { recognition, stop: () => recognition.stop() };
}
