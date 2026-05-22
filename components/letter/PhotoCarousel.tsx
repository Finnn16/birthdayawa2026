/**
 * PhotoCarousel Component
 * Smooth level carousel controlled by scroll and swipe gestures.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./PhotoCarousel.module.css";

interface PhotoCarouselProps {
  images: string[];
  title?: string;
}

type SlideDirection = "left" | "right";

type VisiblePhoto = {
  image: string;
  index: number;
  level: number;
};

const LEVEL_STYLES: Record<
  number,
  {
    opacity: number;
    scale: number;
    zIndex: number;
  }
> = {
  [-2]: { opacity: 0.64, scale: 0.78, zIndex: 1 },
  [-1]: { opacity: 0.86, scale: 0.9, zIndex: 2 },
  0: { opacity: 1, scale: 1, zIndex: 5 },
  1: { opacity: 0.86, scale: 0.9, zIndex: 2 },
  2: { opacity: 0.64, scale: 0.78, zIndex: 1 },
};

const slideTransition = {
  duration: 0.82,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

function getLevels(total: number) {
  if (total >= 5) return [-2, -1, 0, 1, 2];
  if (total === 4) return [-1, 0, 1, 2];
  if (total === 3) return [-1, 0, 1];
  if (total === 2) return [0, 1];
  return [0];
}

export default function PhotoCarousel({ images, title }: PhotoCarouselProps) {
  const pointerRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
  });
  const wheelLockRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("right");

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  const visiblePhotos = useMemo<VisiblePhoto[]>(() => {
    if (!images.length) return [];

    const usedIndexes = new Set<number>();

    return getLevels(images.length).reduce<VisiblePhoto[]>((photos, level) => {
      const index = wrapIndex(activeIndex + level, images.length);

      if (usedIndexes.has(index)) return photos;

      usedIndexes.add(index);
      photos.push({
        image: images[index],
        index,
        level,
      });

      return photos;
    }, []);
  }, [activeIndex, images]);

  const move = useCallback(
    (nextDirection: SlideDirection) => {
      if (images.length <= 1) return;

      setDirection(nextDirection);
      setActiveIndex((current) =>
        wrapIndex(current + (nextDirection === "right" ? 1 : -1), images.length),
      );
    },
    [images.length],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;

    if (!pointer.active) return;

    pointer.active = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 34) {
      move(deltaX < 0 ? "right" : "left");
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const isHorizontalWheel = Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (!isHorizontalWheel || Math.abs(event.deltaX) < 18 || wheelLockRef.current) {
      return;
    }

    event.preventDefault();
    wheelLockRef.current = true;
    move(event.deltaX > 0 ? "right" : "left");

    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 560);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      {title && <h3 className={styles.carouselTitle}>{title}</h3>}

      <div className={styles.wrapper}>
        <div
          className={`${styles.stage} ${isDragging ? styles.dragging : ""}`}
          role="region"
          aria-roledescription="carousel"
          aria-label={title || "Photo memories"}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerUp={stopPointerDrag}
          onPointerCancel={stopPointerDrag}
          onWheel={handleWheel}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move("left");
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              move("right");
            }
          }}
        >
          <AnimatePresence initial={false} custom={direction}>
            {visiblePhotos.map(({ image, index, level }) => (
              <motion.div
                key={`${image}-${index}`}
                className={styles.photoSlot}
                custom={{ direction, level }}
                initial="enter"
                animate="active"
                exit="exit"
                variants={{
                  enter: ({ direction }: { direction: SlideDirection }) => ({
                    opacity: 0,
                    scale: 0.72,
                    x:
                      direction === "right"
                        ? "calc(var(--carousel-step) * 3)"
                        : "calc(var(--carousel-step) * -3)",
                  }),
                  active: ({ level }: { level: number }) => ({
                    opacity: LEVEL_STYLES[level]?.opacity ?? 0,
                    scale: LEVEL_STYLES[level]?.scale ?? 0.72,
                    x: `calc(var(--carousel-step) * ${level})`,
                  }),
                  exit: ({ direction }: { direction: SlideDirection }) => ({
                    opacity: 0,
                    scale: 0.72,
                    x:
                      direction === "right"
                        ? "calc(var(--carousel-step) * -3)"
                        : "calc(var(--carousel-step) * 3)",
                  }),
                }}
                transition={slideTransition}
                style={{ zIndex: LEVEL_STYLES[level]?.zIndex ?? 0 }}
              >
                <div className={styles.photoItem}>
                  <img
                    src={image}
                    alt={`Memory ${index + 1}`}
                    className={styles.photo}
                    draggable={false}
                  />
                  <div className={styles.photoOverlay} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
