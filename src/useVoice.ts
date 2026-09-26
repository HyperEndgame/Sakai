import { useEffect, useRef, useState } from "react";
import { logError } from "./Crash";

// ponytail: Web Speech API (built into Android WebView/Chrome); swap for a native
// speech plugin if recognition quality disappoints
export function useVoice(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // stop the mic when the screen goes away (e.g. switching tabs mid-dictation)
  useEffect(
    () => () => {
      recRef.current?.abort?.();
    },
    [],
  );

  function toggle() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input not supported on this device.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    try {
      const rec = new SR();
      rec.lang = navigator.language || "en-US";
      rec.interimResults = false;
      rec.onresult = (e: any) => {
        const t = e.results?.[0]?.[0]?.transcript;
        if (t) onTextRef.current(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") logError("voice", e.error);
        setListening(false);
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch (e) {
      logError("voice", e);
      setListening(false);
    }
  }

  return { listening, toggle };
}
