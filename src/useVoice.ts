import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { logError } from "./Crash";

// Android: native SpeechRecognizer via plugin (the WebView's Web Speech can't see the
// recognition service on Android 11+). Web: the browser's Web Speech API.
export function useVoice(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const native = Capacitor.isNativePlatform();

  // stop the mic when the screen goes away (e.g. switching tabs mid-dictation)
  useEffect(
    () => () => {
      if (native) SpeechRecognition.stop().catch(() => {});
      else recRef.current?.abort?.();
    },
    [native],
  );

  async function toggleNative() {
    if (listening) {
      await SpeechRecognition.stop().catch(() => {});
      setListening(false);
      return;
    }
    try {
      if (!(await SpeechRecognition.available()).available) {
        alert("Speech recognition isn't available on this phone. Check that the Google app is installed and enabled.");
        return;
      }
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") {
        alert("Allow microphone access in Android settings to use voice input.");
        return;
      }
      setListening(true);
      const { matches } = await SpeechRecognition.start({ language: navigator.language || "en-US", maxResults: 1, popup: false, partialResults: false });
      if (matches?.[0]) onTextRef.current(matches[0]);
    } catch (e: any) {
      // "No match" just means silence; anything else is worth recording
      if (!/no match|didn't understand/i.test(e?.message ?? "")) logError("voice", e);
    } finally {
      setListening(false);
    }
  }

  function toggleWeb() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input not supported on this device.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
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
  }

  return { listening, toggle: native ? toggleNative : toggleWeb };
}
