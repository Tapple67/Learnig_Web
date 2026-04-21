"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  fileUrl: string;
  page: number;
  zoom: number;
  onLoadStateChange?: (state: "idle" | "loading" | "success" | "error") => void;
  onErrorMessage?: (message: string) => void;
};

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function PdfViewer({
  fileUrl,
  page,
  zoom,
  onLoadStateChange,
  onErrorMessage,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const loadSeqRef = useRef(0);

  const [pdfReady, setPdfReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (!wrapperRef.current) return;
      setContainerWidth(wrapperRef.current.clientWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfJs() {
      try {
        if (window.pdfjsLib) {
          setPdfReady(true);
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;

        script.onload = () => {
          if (cancelled) return;
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            setPdfReady(true);
          }
        };

        script.onerror = () => {
          if (cancelled) return;
          onLoadStateChange?.("error");
          onErrorMessage?.("pdf.js 라이브러리를 불러오지 못했습니다.");
        };

        document.body.appendChild(script);
      } catch {
        onLoadStateChange?.("error");
        onErrorMessage?.("PDF 뷰어 초기화 중 오류가 발생했습니다.");
      }
    }

    loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, [onErrorMessage, onLoadStateChange]);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      if (
        !pdfReady ||
        !fileUrl ||
        !canvasRef.current ||
        !window.pdfjsLib ||
        !containerWidth
      ) {
        return;
      }

      const seq = ++loadSeqRef.current;
      onLoadStateChange?.("loading");
      onErrorMessage?.("");

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        let pdf = pdfRef.current;

        if (!pdf || pdfRef.current?._src !== fileUrl) {
          const loadingTask = window.pdfjsLib.getDocument(fileUrl);
          pdf = await loadingTask.promise;
          pdf._src = fileUrl;
          pdfRef.current = pdf;
        }

        if (cancelled || seq !== loadSeqRef.current) return;

        const safePage = Math.max(1, page);
        const pageObj = await pdf.getPage(safePage);

        if (cancelled || seq !== loadSeqRef.current) return;

        const baseViewport = pageObj.getViewport({ scale: 1 });
        const horizontalPadding = 32;
        const fitWidth = Math.max(300, containerWidth - horizontalPadding);
        const fitScale = fitWidth / baseViewport.width;

        const finalScale = Math.max(0.2, Math.min(4, fitScale * zoom));
        const viewport = pageObj.getViewport({ scale: finalScale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) {
          onLoadStateChange?.("error");
          onErrorMessage?.("캔버스를 초기화할 수 없습니다.");
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderTask = pageObj.render({
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled || seq !== loadSeqRef.current) return;

        onLoadStateChange?.("success");
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;

        onLoadStateChange?.("error");

        if (err?.message?.includes("Missing PDF")) {
          onErrorMessage?.("PDF 파일을 찾을 수 없습니다.");
        } else if (err?.message?.includes("Unexpected server response")) {
          onErrorMessage?.("PDF 주소가 만료되었거나 접근할 수 없습니다.");
        } else {
          onErrorMessage?.("PDF를 표시하는 중 오류가 발생했습니다.");
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfReady, fileUrl, page, zoom, containerWidth, onErrorMessage, onLoadStateChange]);

  return (
    <div
      ref={wrapperRef}
      className="flex h-full w-full items-start justify-center overflow-auto bg-white p-4"
    >
      <canvas ref={canvasRef} className="block max-w-none h-auto shadow-sm" />
    </div>
  );
}