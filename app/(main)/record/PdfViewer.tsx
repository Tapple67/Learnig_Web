"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Mode = "single" | "scroll";

export default function PdfViewer({
  fileUrl,
  mode,
  page,
  onPageChange,
}: {
  fileUrl: string;
  mode: Mode;
  page: number;
  onPageChange: (p: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ignoreSyncRef = useRef(false);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    if (mode !== "scroll") return;
    const el = wrapRef.current;
    if (!el) return;

    const onScroll = () => {
      if (ignoreSyncRef.current) return;

      const topY = el.getBoundingClientRect().top + 20;

      let best = 1;
      let bestDist = Infinity;

      for (let p = 1; p <= numPages; p++) {
        const node = pageRefs.current[p];
        if (!node) continue;
        const r = node.getBoundingClientRect();
        const dist = Math.abs(r.top - topY);
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }

      if (best !== page) onPageChange(best);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [mode, numPages, page, onPageChange]);

  useEffect(() => {
    if (mode !== "scroll") return;
    const node = pageRefs.current[page];
    if (!node) return;

    ignoreSyncRef.current = true;
    node.scrollIntoView({ block: "start" });
    requestAnimationFrame(() => {
      ignoreSyncRef.current = false;
    });
  }, [mode, page]);

  const pageWidth = useMemo(() => {
    const w = wrapRef.current?.clientWidth ?? 900;
    return Math.max(320, Math.min(1100, w - 24));
  }, [fileUrl, mode]);

  return (
    <div ref={wrapRef} className="h-full w-full overflow-auto p-2">
      <Document
        file={fileUrl}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="text-sm text-gray-600">PDF 로딩 중...</div>}
        error={<div className="text-sm text-red-600">PDF 로딩 실패</div>}
        noData={<div className="text-sm text-gray-600">PDF 없음</div>}
      >
        {mode === "single" ? (
          <div className="flex justify-center">
            <Page
              pageNumber={page}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: numPages }, (_, idx) => {
              const p = idx + 1;
              return (
                <div
                  key={p}
                  ref={(el) => {
                    pageRefs.current[p] = el;
                  }}
                  className={p === page ? "ring-2 ring-blue-400 rounded-md p-1" : ""}
                >
                  <div className="mb-1 text-xs text-gray-500">Page {p}</div>
                  <div className="flex justify-center">
                    <Page
                      pageNumber={p}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Document>
    </div>
  );
}