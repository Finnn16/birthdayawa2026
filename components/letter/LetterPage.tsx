/**
 * LetterPage Component
 * Render single newspaper-style page
 */

"use client";

import React from "react";
import styles from "./LetterPage.module.css";
import { LetterPage as LetterPageType } from "@/lib/letter/letterContent";
import PhotoCarousel from "./PhotoCarousel";

interface LetterPageProps {
  page: LetterPageType;
  isVisible: boolean;
}

export default function LetterPage({ page, isVisible }: LetterPageProps) {
  const renderSection = (
    section: LetterPageType["sections"][0],
    idx: number,
  ) => {
    switch (section.type) {
      case "headline":
        return (
          <h1
            key={idx}
            className={`${styles.section} ${styles.headline} ${styles[`size-${section.size || "lg"}`]} ${styles[`align-${section.alignment || "center"}`]}`}
          >
            {section.content}
          </h1>
        );

      case "subheading":
        return (
          <h2
            key={idx}
            className={`${styles.section} ${styles.subheading} ${styles[`size-${section.size || "md"}`]} ${styles[`align-${section.alignment || "center"}`]}`}
          >
            {section.content}
          </h2>
        );

      case "section-title":
        return (
          <h3
            key={idx}
            className={`${styles.section} ${styles.sectionTitle} ${styles[`size-${section.size || "lg"}`]} ${styles[`align-${section.alignment || "center"}`]}`}
          >
            {section.content}
          </h3>
        );

      case "body":
        return (
          <p
            key={idx}
            className={`${styles.section} ${styles.body} ${styles[`align-${section.alignment || "left"}`]}`}
            style={{ whiteSpace: "pre-line" }}
          >
            {section.content}
          </p>
        );

      case "quote":
        return (
          <blockquote
            key={idx}
            className={`${styles.section} ${styles.quote} ${styles[`size-${section.size || "md"}`]} ${styles[`align-${section.alignment || "center"}`]}`}
          >
            {section.content}
          </blockquote>
        );

      case "image":
        return (
          <div key={idx} className={styles.imageContainer}>
            <img
              src={section.content}
              alt="Letter content"
              className={styles.image}
            />
          </div>
        );

      case "carousel":
        return (
          <PhotoCarousel
            key={idx}
            images={section.images || []}
            title={section.content}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${styles.page} ${isVisible ? styles.visible : ""}`}>
      {/* Newspaper Header */}
      {page.title && (
        <div className={styles.header}>
          {page.location && (
            <div className={styles.location}>{page.location}</div>
          )}
          <div className={styles.titleBar} />
          <h1 className={styles.newspaperTitle}>{page.title}</h1>
          <div className={styles.titleBar} />
          {page.date && <div className={styles.date}>{page.date}</div>}
          {page.subtitle && (
            <div className={styles.edition}>{page.subtitle}</div>
          )}
        </div>
      )}

      {/* Main Image (optional) */}
      {page.imageUrl && (
        <div className={styles.mainImageContainer}>
          <img
            src={page.imageUrl}
            alt="Page featured"
            className={styles.mainImage}
          />
        </div>
      )}

      {/* Content Sections */}
      <div className={styles.content}>
        {page.sections.map((section, idx) => renderSection(section, idx))}
      </div>

      {/* Page Number */}
      <div className={styles.pageNumber}>Page {page.pageNumber}</div>
    </div>
  );
}
