"use client";

import { useCallback, useRef } from "react";

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];

const pickMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
};

// Gravação com o MediaRecorder do navegador (o backend converte o áudio com
// ffmpeg antes de enviar ao WhatsApp).
export const useAudioRecorder = () => {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const releaseMic = () => recorder.current?.stream.getTracks().forEach(track => track.stop());

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    media.ondataavailable = event => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    media.start();
    recorder.current = media;
  }, []);

  // Para a gravação e devolve o áudio (tipo sem os parâmetros de codec).
  const stop = useCallback(
    () =>
      new Promise<Blob | null>(resolve => {
        const media = recorder.current;
        if (!media || media.state === "inactive") {
          resolve(null);
          return;
        }
        media.onstop = () => {
          releaseMic();
          const type = (media.mimeType || "audio/webm").split(";")[0];
          resolve(new Blob(chunks.current, { type }));
          recorder.current = null;
        };
        media.stop();
      }),
    []
  );

  return { start, stop };
};
