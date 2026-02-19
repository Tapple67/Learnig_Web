"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "single" | "scroll";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

async function loadPdfJsFromCdn() {
  if (window.pdfjsLib) return window.pdfjsLib;

  // pdf.js (브라우저에서만 로드)
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PDF.js 로드 실패"));
    document.head.appendChild(s);
  });

  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js 로드 후 pdfjsLib가 없습니다.");

  // 워커 설정 (CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.js";

  return pdfjsLib;
}

export default function PdfViewer({
  fileUrl,
  mode,
  page,
  onRequestPageChange,
}: {
  fileUrl: string;
  mode: Mode;
  page: number;
  onRequestPageChange: (nextPage: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pdfDocRef = useRef<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const renderedSetRef = useRef<Set<number>>(new Set());
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const ignoreScrollPageSyncRef = useRef(false);

  // 문서 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("PDF 불러오는 중...");
        renderedSetRef.current = new Set();
        canvasMapRef.current = new Map();
        setNumPages(0);

        const pdfjsLib = await loadPdfJsFromCdn();

        const resp = await fetch(fileUrl);
        if (!resp.ok) throw new Error(`PDF fetch 실패: ${resp.status}`);

        const buf = await resp.arrayBuffer();
        const task = pdfjsLib.getDocument({ data: buf });
        const pdfDoc = await task.promise;

        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setStatus("");
      } catch (e: any) {
        setStatus(e?.message ?? "PDF 로딩 실패");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // 한 페이지 렌더 함수
  const renderPage = async (p: number, canvas: HTMLCanvasElement) => {
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc) return;
    const safe = Math.max(1, Math.min(p, pdfDoc.numPages));

    const pdfPage = await pdfDoc.getPage(safe);
    // 크기: 컨테이너 폭에 맞추기
    const container = containerRef.current;
    const targetWidth = container ? Math.min(container.clientWidth - 24, 1100) : 900;

    const viewport1 = pdfPage.getViewport({ scale: 1 });
    const scale = targetWidth / viewport1.width;
    const viewport = pdfPage.getViewport({ scale });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    renderedSetRef.current.add(safe);
  };

  // SINGLE 모드: page 바뀌면 단일 캔버스에 다시 그림
  useEffect(() => {
    if (mode !== "single") return;
    if (!pdfDocRef.current) return;

    (async () => {
      const canvas = singleCanvasRef.current;
      if (!canvas) return;
      setStatus(`페이지 ${page} 렌더링...`);
      try {
        await renderPage(page, canvas);
        setStatus("");
      } catch (e: any) {
        setStatus(e?.message ?? "페이지 렌더링 실패");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, page, numPages]);

  // SCROLL 모드: 캔버스들 준비 + IntersectionObserver로 필요한 페이지만 렌더
  useEffect(() => {
    if (mode !== "scroll") return;
    if (!pdfDocRef.current || numPages === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // 페이지 wrapper들 안에 canvas가 생성되면 map에 등록해둠
    const canvases = container.querySelectorAll("canvas[data-page]");
    canvases.forEach((c) => {
      const canvas = c as HTMLCanvasElement;
      const p = Number(canvas.dataset.page);
      if (p) canvasMapRef.current.set(p, canvas);
    });

    const io = new IntersectionObserver(
      async (entries) => {
        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          const canvas = ent.target as HTMLCanvasElement;
          const p = Number(canvas.dataset.page);
          if (!p) continue;
          if (renderedSetRef.current.has(p)) continue;
          try {
            await renderPage(p, canvas);
          } catch {}
        }
      },
      { root: container, rootMargin: "800px 0px 800px 0px", threshold: 0.01 }
    );

    canvases.forEach((c) => io.observe(c));

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, numPages]);

  // SCROLL 모드: 스크롤 위치로 “현재 페이지” 계산 → 메모도 따라오게
  useEffect(() => {
    if (mode !== "scroll") return;

    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      if (ignoreScrollPageSyncRef.current) return;

      // 컨테이너 상단 기준으로 가장 가까운 canvas를 현재 페이지로
      const rect = container.getBoundingClientRect();
      const topY = rect.top + 10;

      let bestPage = 1;
      let bestDist = Infinity;

      for (let p = 1; p <= numPages; p++) {
        const canvas = canvasMapRef.current.get(p);
        if (!canvas) continue;
        const r = canvas.getBoundingClientRect();
        const dist = Math.abs(r.top - topY);
        if (dist < bestDist) {
          bestDist = dist;
          bestPage = p;
        }
      }

      if (bestPage !== page) {
        onRequestPageChange(bestPage);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, numPages, page]);

  // 버튼으로 page 바뀌었을 때(스크롤 모드) 해당 페이지로 스크롤 이동
  useEffect(() => {
    if (mode !== "scroll") return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasMapRef.current.get(page);
    if (!canvas) return;

    ignoreScrollPageSyncRef.current = true;
    canvas.scrollIntoView({ behavior: "instant" as any, block: "start" });

    // 다음 프레임에서 다시 감지 허용
    requestAnimationFrame(() => {
      ignoreScrollPageSyncRef.current = false;
    });
  }, [mode, page]);

  const safePageInfo = useMemo(() => {
    if (!numPages) return "";
    return `${Math.min(Math.max(1, page), numPages)} / ${numPages}`;
  }, [page, numPages]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto p-2">
      {status && <div className="mb-2 text-sm text-gray-600">{status}</div>}

      {mode === "single" ? (
        <div className="flex justify-center">
          <div>
            <div className="mb-2 text-xs text-gray-500">Page {safePageInfo}</div>
            <canvas ref={singleCanvasRef} className="rounded-md border" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
            <div key={p} className="flex justify-center">
              <div>
                <div className="mb-1 text-xs text-gray-500">Page {p}</div>
                {/* 처음엔 빈 캔버스(placeholder). 화면 근처 오면 렌더됨 */}
                <canvas
                  data-page={p}
                  className={`rounded-md border ${p === page ? "ring-2 ring-blue-400" : ""}`}
                  style={{ width: "100%", maxWidth: 1100, height: 20 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}