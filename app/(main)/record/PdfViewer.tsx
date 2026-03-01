"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  fileUrl: string; // signedUrl
  page: number;
  onNumPages?: (n: number) => void;
};

export default function PdfViewer({ fileUrl, page, onNumPages }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null); // PDFDocumentProxy
  const renderTaskRef = useRef<any>(null);
  const loadSeqRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [docKey, setDocKey] = useState(0); // 문서 로드 완료 트리거

  // ✅ 1) PDF 로드(파일 바뀔 때만)
  useEffect(() => {
    if (!fileUrl) {
      pdfRef.current = null;
      setErr("");
      setLoading(false);
      return;
    }

    let canceled = false;
    const seq = ++loadSeqRef.current;

    (async () => {
      setErr("");
      setLoading(true);

      try {
        // pdfjs는 브라우저에서만 동적 import
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf");

        // ✅ worker 설정: public에 pdf.worker.min.js 가 있어야 함
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        // 이전 렌더 취소
        try {
          renderTaskRef.current?.cancel?.();
        } catch {}

        // ✅ signedUrl을 우리가 직접 fetch해서 data로 넘기기 (CORS/Range 이슈 감소)
        const res = await fetch(fileUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`PDF 다운로드 실패 (${res.status})`);
        const ab = await res.arrayBuffer();
        if (canceled || seq !== loadSeqRef.current) return;

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(ab),
          // Supabase 환경에서 더 안정적으로(필요 시)
          disableAutoFetch: true,
          disableStream: true,
          disableRange: true,
        });

        const pdf = await loadingTask.promise;
        if (canceled || seq !== loadSeqRef.current) return;

        pdfRef.current = pdf;
        onNumPages?.(pdf.numPages);

        // ✅ 문서 로드가 끝났다는 트리거(이걸로 첫 렌더가 무조건 실행됨)
        setDocKey((k) => k + 1);
      } catch (e: any) {
        if (!canceled) setErr(e?.message ?? "PDF 로드 실패");
        pdfRef.current = null;
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

  // ✅ 2) 현재 페이지 렌더 (page 또는 문서 로드 완료 시)
  useEffect(() => {
    let canceled = false;

    (async () => {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;

      setErr("");

      try {
        // 이전 렌더 취소(연속 클릭 대비)
        try {
          renderTaskRef.current?.cancel?.();
        } catch {}

        const safePage = Math.max(1, Math.min(page, pdf.numPages));
        const pdfPage = await pdf.getPage(safePage);
        if (canceled) return;

        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderTask = pdfPage.render({ canvasContext: ctx, viewport });
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
  }, [page, docKey]); // ✅ docKey로 “문서 로드 후 첫 렌더” 보장

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