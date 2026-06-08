"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LetterPage as LetterPageView } from "@/components/letter";
import { getTodayDateString } from "@/lib/date";
import {
  LETTER_RELEASE_DATE,
  isLetterUnlocked,
  letterPages,
} from "@/lib/letter/letterContent";

function LetterPdfContent() {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("autoPrint") === "1";
  const unlocked = isLetterUnlocked(getTodayDateString());

  useEffect(() => {
    if (!autoPrint || !unlocked) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [autoPrint, unlocked]);

  const pageCount = useMemo(() => letterPages.length, []);

  const handlePrint = () => {
    window.print();
  };

  if (!unlocked) {
    return (
      <main style={shellStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>Surat belum dibuka</p>
          <h1 style={titleStyle}>PDF surat belum tersedia</h1>
          <p style={bodyStyle}>
            Surat ini baru bisa diunduh setelah {LETTER_RELEASE_DATE}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .letter-download-controls {
            display: none !important;
          }

          .letter-print-shell {
            padding: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      <div className="letter-download-controls" style={controlsStyle}>
        <div>
          <p style={eyebrowStyle}>Surat siap cetak</p>
          <h1 style={titleStyle}>Download to PDF</h1>
          <p style={bodyStyle}>
            Halaman ini berisi {pageCount} lembar. Klik tombol di bawah untuk
            membuka dialog simpan PDF.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={handlePrint}
            style={primaryButtonStyle}
          >
            Download PDF
          </button>
        </div>
      </div>

      <section className="letter-print-shell" style={pagesWrapStyle}>
        {letterPages.map((page, index) => (
          <article
            key={page.pageNumber}
            style={{
              breakAfter: index < letterPages.length - 1 ? "page" : "auto",
              pageBreakAfter:
                index < letterPages.length - 1 ? "always" : "auto",
            }}
          >
            <LetterPageView page={page} isVisible={true} />
          </article>
        ))}
      </section>
    </main>
  );
}

export default function LetterPdfPage() {
  return (
    <Suspense fallback={<main style={shellStyle} />}>
      <LetterPdfContent />
    </Suspense>
  );
}

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "24px",
  background:
    "radial-gradient(circle at top, rgba(168, 154, 143, 0.16), transparent 36%), linear-gradient(180deg, #fffaf5 0%, #fefdfb 100%)",
  color: "#1a1a1a",
};

const controlsStyle: React.CSSProperties = {
  maxWidth: "980px",
  margin: "0 auto 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "20px 24px",
  border: "1px solid #e0d5c8",
  borderRadius: "20px",
  background: "rgba(255, 250, 245, 0.9)",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.08)",
  backdropFilter: "blur(10px)",
};

const panelStyle: React.CSSProperties = {
  ...controlsStyle,
  display: "block",
};

const pagesWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "24px",
  paddingBottom: "24px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#7a7a7a",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  fontFamily: "Syne, sans-serif",
  fontSize: "clamp(24px, 3vw, 40px)",
  lineHeight: 1.05,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: "60ch",
  color: "#5a5a5a",
  lineHeight: 1.7,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexShrink: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "999px",
  padding: "14px 20px",
  background: "#1a1a1a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(26, 26, 26, 0.18)",
};
