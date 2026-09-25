import { useEffect, useRef } from "react";

// Android back button: MainActivity asks window.sakaiBack() first; the newest active
// handler wins (settings subpage before tab, etc.). Returns false → native backgrounds the app.
const stack: (() => void)[] = [];
(window as any).sakaiBack = () => {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
};

export function useBack(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return;
    const fn = () => ref.current();
    stack.push(fn);
    return () => {
      stack.splice(stack.indexOf(fn), 1);
    };
  }, [active]);
}
