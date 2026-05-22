/**
 * LetterFlip Component
 * Main component untuk multi-page newspaper letter dengan flip animation
 * Features: Book flip animation, click navigation, state persistence, audio effects
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import LetterPage from "./LetterPage";
import styles from "./LetterFlip.module.css";
import { letterPages, letterAudio } from "@/lib/letter/letterContent";

interface LetterFlipProps {
  isOpen: boolean;
  onClose: () => void;
  autoPlayAudio?: boolean;
}

const pageVariants: Variants = {
  enter: (dir: 1 | -1) => ({
    x: dir > 0 ? 8 : -8,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 1 | -1) => ({
    x: dir > 0 ? -8 : 8,
    opacity: 0,
  }),
};

export default function LetterFlip({
  isOpen,
  onClose,
  autoPlayAudio = true,
}: LetterFlipProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = next, -1 = previous
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load saved page from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPage = localStorage.getItem("letterCurrentPage");
      if (savedPage) {
        setCurrentPage(parseInt(savedPage, 10));
      }
    }
  }, []);

  // Save current page to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("letterCurrentPage", currentPage.toString());
    }
  }, [currentPage]);

  // Play opening sound on first open
  useEffect(() => {
    if (isOpen && !hasBeenOpened && autoPlayAudio) {
      playSound(letterAudio.letterOpen);
      setHasBeenOpened(true);
    }
  }, [isOpen, hasBeenOpened, autoPlayAudio]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const playSound = (audioPath: string) => {
    try {
      const audio = new Audio(audioPath);
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (error) {
      console.log("Audio error:", error);
    }
  };

  const handleNextPage = useCallback(() => {
    if (isFlipping || currentPage >= letterPages.length - 1) return;

    setIsFlipping(true);
    setDirection(1); // Forward
    playSound(letterAudio.pageFlip);

    setTimeout(() => {
      setCurrentPage((prev) => Math.min(prev + 1, letterPages.length - 1));
      setIsFlipping(false);
    }, 700); // Increased for smoother spring animation
  }, [currentPage, isFlipping]);

  const handlePreviousPage = useCallback(() => {
    if (isFlipping || currentPage <= 0) return;

    setIsFlipping(true);
    setDirection(-1); // Backward
    playSound(letterAudio.pageFlip);

    setTimeout(() => {
      setCurrentPage((prev) => Math.max(prev - 1, 0));
      setIsFlipping(false);
    }, 700); // Increased for smoother spring animation
  }, [currentPage, isFlipping]);

  const handleClose = () => {
    // Page state sudah disimpan di localStorage
    onClose();
  };

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === letterPages.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div
            className={styles.modalContainer}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Letter Wrapper - Book-like container */}
            <div className={styles.letterWrapper}>
              {/* Header with close button */}
              <div className={styles.header}>
                <div className={styles.pageIndicator}>
                  {currentPage + 1} / {letterPages.length}
                </div>
                <button
                  onClick={handleClose}
                  className={styles.closeButton}
                  aria-label="Close letter"
                >
                  X
                </button>
              </div>

              {/* Page Container with 3D flip effect */}
              <div className={styles.pageContainer}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentPage}
                    className={styles.pageWrapper}
                    custom={direction}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className={styles.pageInner}>
                      <LetterPage
                        page={letterPages[currentPage]}
                        isVisible={true}
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Controls */}
              <div className={styles.controls}>
                <button
                  onClick={handlePreviousPage}
                  disabled={isFirstPage || isFlipping}
                  className={`${styles.navButton} ${styles.prevButton}`}
                  aria-label="Previous page"
                >
                  &lt;
                </button>

                <div className={styles.controlCenter}>
                  <audio
                    ref={audioRef}
                    onPlay={() => console.log("Audio playing")}
                    onError={(e) => console.log("Audio error:", e)}
                  />
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={isLastPage || isFlipping}
                  className={`${styles.navButton} ${styles.nextButton}`}
                  aria-label="Next page"
                >
                  &gt;
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
