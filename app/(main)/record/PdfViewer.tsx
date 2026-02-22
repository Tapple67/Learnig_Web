"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  fileUrl: string;
  page: number;
  onNumPages?: (n: number) => void; // (선택) 총 페이지 전달
};

export default function PdfViewer({ fileUrl, page, onNumPages }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null); // PDFDocumentProxy
  const renderTaskRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ 1) PDF 로드(파일 바뀔 때만)
  useEffect(() => {
    let canceled = false;

    (async () => {
      setErr("");
      setLoading(true);

      try {
        // pdfjs는 SSR에서 터질 수 있으니 브라우저에서만 동적 import
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf");

        // worker 설정(필수) - public에 pdf.worker.min.js 를 두는 방식
        // ✅ 아래에 "public에 worker 넣는 법" 설명해줄게
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        // 이전 문서 정리
        pdfRef.current = null;

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          withCredentials: false,
        });

        const pdf = await loadingTask.promise;
        if (canceled) return;

        pdfRef.current = pdf;
        onNumPages?.(pdf.numPages);
      } catch (e: any) {
        if (!canceled) setErr(e?.message ?? "PDF 로드 실패");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
      try {
        renderTaskRef.current?.cancel?.();
      } catch {}
    };
  }, [fileUrl, onNumPages]);

  // ✅ 2) 현재 페이지 렌더(페이지 바뀔 때마다)
  useEffect(() => {
    let canceled = false;

    (async () => {
      if (!pdfRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      setErr("");

      try {
        // 이전 렌더 작업 취소(연속 클릭 대비)
        try {
          renderTaskRef.current?.cancel?.();
        } catch {}

        const pdf = pdfRef.current;
        const safePage = Math.max(1, Math.min(page, pdf.numPages));

        const pdfPage = await pdf.getPage(safePage);
        if (canceled) return;

        const viewport = pdfPage.getViewport({ scale: 1.5 }); // 선명도 (필요하면 1.2~2.0 조절)
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderTask = pdfPage.render({
          canvasContext: ctx,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (e: any) {
        if (!canceled) setErr(e?.message ?? "PDF 렌더 실패");
      }
    })();

    return () => {
      canceled = true;
      try {
        renderTaskRef.current?.cancel?.();
      } catch {}
    };
  }, [page]);

  return (
    <div className="h-full w-full overflow-auto flex items-start justify-center p-2 bg-white">
      {loading && <div className="text-sm text-gray-600">PDF 로딩 중...</div>}
      {err && <div className="text-sm text-red-600">PDF 로딩 실패: {err}</div>}
      {!loading && !err && (
        <canvas ref={canvasRef} className="max-w-full h-auto border rounded" />
      )}
    </div>
  );
}