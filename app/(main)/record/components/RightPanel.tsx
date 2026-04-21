"use client";

import { useEffect, useRef, useState } from "react";
import PdfViewer from "../PdfViewer";

type Props = {
  activeMaterialId: string;
  signedUrl: string;
  loadingFileUrl: boolean;

  page: number;
  requestPageChange: (p: number) => void;

  content: string;
  setContent: (v: string) => void;
  setDirty: (v: boolean) => void;
  saveNote: () => void | Promise<void>;

  createQuiz: () => void;
  quizLoading: boolean;
};

export default function RightPanel({
  activeMaterialId,
  signedUrl,
  loadingFileUrl,
  page,
  requestPageChange,
  content,
  setContent,
  setDirty,
  saveNote,
  createQuiz,
  quizLoading,
}: Props) {
  const [viewerState, setViewerState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [viewerError, setViewerError] = useState("");
  const [toast, setToast] = useState("");
  const [zoom, setZoom] = useState(1);

  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [activeMaterialId]);

  async function handleSaveNote() {
    await saveNote();
    setToast("저장되었습니다");

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
    }, 1200);
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(0.2, Number((prev - 0.2).toFixed(1))));
  }

  function handleZoomIn() {
    setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(1))));
  }

  const topButtonClass =
    "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
  const panelClass =
    "rounded-[22px] border border-slate-200 bg-[#fafbfd] p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)]";

  const arrowButtonClass =
    "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-lg font-semibold text-slate-700 shadow-md transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">수업파일</span>
            <span className="ml-2">Page: {page}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className={topButtonClass}
              disabled={!signedUrl || zoom <= 0.2}
              title="축소"
            >
              -
            </button>

            <div className="min-w-[64px] text-center text-sm text-slate-500">
              {Math.round(zoom * 100)}%
            </div>

            <button
              type="button"
              onClick={handleZoomIn}
              className={topButtonClass}
              disabled={!signedUrl || zoom >= 3}
              title="확대"
            >
              +
            </button>

            <button onClick={createQuiz} className={topButtonClass}>
              {quizLoading ? "생성중..." : "퀴즈 생성"}
            </button>

            <button
              className={topButtonClass}
              onClick={() => requestPageChange(page - 1)}
              disabled={page <= 1}
            >
              이전
            </button>

            <button className={topButtonClass} onClick={() => requestPageChange(page + 1)}>
              다음
            </button>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className="relative h-[56vh] overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          {!activeMaterialId ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              왼쪽에서 PDF를 선택해줘.
            </div>
          ) : loadingFileUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              파일 URL 준비중...
            </div>
          ) : !signedUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              PDF 주소를 불러올 수 없음
            </div>
          ) : (
            <>
              {/* 좌측 화살표 */}
              <button
                type="button"
                onClick={() => requestPageChange(page - 1)}
                disabled={page <= 1}
                className={`${arrowButtonClass} left-4`}
                title="이전 페이지"
              >
                ‹
              </button>

              {/* 우측 화살표 */}
              <button
                type="button"
                onClick={() => requestPageChange(page + 1)}
                className={`${arrowButtonClass} right-4`}
                title="다음 페이지"
              >
                ›
              </button>

              <PdfViewer
                fileUrl={signedUrl}
                page={page}
                zoom={zoom}
                onLoadStateChange={setViewerState}
                onErrorMessage={setViewerError}
              />

              {viewerState === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-500">
                  PDF 로딩중...
                </div>
              )}

              {viewerState === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-4 text-sm text-red-600">
                  {viewerError || "PDF를 불러올 수 없음"}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={panelClass}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">사용자 기록</div>

          <button onClick={handleSaveNote} className={topButtonClass}>
            저장
          </button>
        </div>

        <textarea
          className="h-[150px] w-full resize-none rounded-[18px] border border-slate-200 bg-white p-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder="현재 페이지에 대한 메모"
        />
      </div>
    </div>
  );
}