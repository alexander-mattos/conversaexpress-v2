"use client";

import { useEffect, useRef } from "react";
import { useThemeMode } from "@/contexts/ThemeModeContext";

// Seletor do emoji-mart 5 (mesmo projeto do frontend atual), carregado só
// quando aberto. Usa o componente web do emoji-mart, que funciona com o React 19.
export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelect);
  const { mode } = useThemeMode();

  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    const element = container.current;
    (async () => {
      const [{ Picker }, { default: data }] = await Promise.all([import("emoji-mart"), import("@emoji-mart/data")]);
      if (disposed || !element) return;
      const picker = new Picker({
        data,
        perLine: 16,
        previewPosition: "none",
        skinTonePosition: "none",
        theme: mode,
        onEmojiSelect: (emoji: { native: string }) => callback.current(emoji.native)
      });
      element.replaceChildren(picker as unknown as Node);
    })();
    return () => {
      disposed = true;
      element?.replaceChildren();
    };
  }, [mode]);

  return <div ref={container} />;
}
