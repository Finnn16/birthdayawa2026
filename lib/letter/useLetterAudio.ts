/**
 * useLetterAudio Hook
 * Manages audio effects untuk letter experience
 */

import { useRef, useCallback } from "react";

export const useLetterAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const globalVolumeRef = useRef(1);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.warn("AudioContext not available:", error);
      }
    }
  }, []);

  // Play sound effect
  const playSound = useCallback(async (audioPath: string, volume = 0.5) => {
    try {
      const audio = new Audio(audioPath);
      audio.volume = Math.max(0, Math.min(1, volume * globalVolumeRef.current));
      await audio.play();
    } catch (error) {
      console.warn("Failed to play audio:", error);
    }
  }, []);

  // Play sound with fallback (for best browser compatibility)
  const playSoundWithFallback = useCallback(
    async (audioPath: string, fallbackPath?: string, volume = 0.5) => {
      try {
        await playSound(audioPath, volume);
      } catch (error) {
        if (fallbackPath) {
          console.warn(`Fallback to: ${fallbackPath}`);
          try {
            await playSound(fallbackPath, volume);
          } catch (fallbackError) {
            console.warn("Fallback audio also failed:", fallbackError);
          }
        }
      }
    },
    [playSound],
  );

  // Mute/unmute all sounds
  const setGlobalVolume = useCallback((volume: number) => {
    globalVolumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);

  return {
    playSound,
    playSoundWithFallback,
    setGlobalVolume,
    initAudioContext,
  };
};
