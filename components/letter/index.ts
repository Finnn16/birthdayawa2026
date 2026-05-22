/**
 * Letter Components Index
 * Central export point untuk semua letter-related components & utilities
 */

// Main component
export { default as LetterFlip } from "./LetterFlip";

// Sub-components
export { default as LetterPage } from "./LetterPage";
export { default as PhotoCarousel } from "./PhotoCarousel";

// Types & content
export type {
  LetterSection,
  LetterPage as LetterPageType,
} from "@/lib/letter/letterContent";
export { letterPages, letterAudio } from "@/lib/letter/letterContent";

// Hooks
export { useLetterAudio } from "@/lib/letter/useLetterAudio";
