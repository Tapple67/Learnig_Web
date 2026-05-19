"use client";

import { useEffect, useRef, useState } from "react";
import PdfViewer from "./PdfViewer";

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onGoSubject: () => void;
  activeMaterialId: string;
  signedUrl: string;
  loadingFileUrl: boolean;

  page: number;
  requestPageChange: (p: number) => void;

  content: string;
  setContent: (v: string) => void;
  setDirty: (v: boolean) => void;
  saveNote: () => void | Promise<void>;
};

export default function RightPanel({
  sidebarOpen,
  onToggleSidebar,
  onGoSubject,
  activeMaterialId,
  signedUrl,
  loadingFileUrl,
  page,
  requestPageChange,
  content,
  setContent,
  setDirty,
  saveNote,
}: Props) {
  const [viewerState, setViewerState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [viewerError, setViewerError] = useState("");
  const [toast, setToast] = useState("");
  const [zoom, setZoom] = useState(1);

  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [activeMaterialId]);

  async function handleSaveNote() {
    await saveNote();
    setToast("저장되었습니다");
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 1200);
  }

  const topButtonClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
  const panelClass = "rounded-lg bg-[#fafbfd] p-2";
  const arrowButtonClass =
    "absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-lg font-semibold text-slate-700 shadow-md transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="h-full space-y-3">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid h-[calc(100%-12px)] min-h-0 gap-0 lg:grid-cols-[6fr_8px_4fr]">
        <div className="min-h-0 pr-0 lg:pr-2">
          <div className={`${panelClass} flex h-full min-h-0 flex-col`}>
            <div className="mb-2 rounded-lg bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onToggleSidebar} className={topButtonClass}>
                    {sidebarOpen ? "자료함 숨기기" : ">"}
                  </button>
                  <button type="button" onClick={onGoSubject} className={topButtonClass}>
                    닫기
                  </button>
                </div>

                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-800">수업파일</span>
                  <span className="ml-2">Page: {page}</span>
                </div>

                <div />
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(0.2, Number((prev - 0.2).toFixed(1))))}
                    className={topButtonClass}
                    disabled={!signedUrl || zoom <= 0.2}
                  >
                    -
                  </button>
                  <div className="min-w-[58px] text-center text-sm text-slate-500">{Math.round(zoom * 100)}%</div>
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(1))))}
                    className={topButtonClass}
                    disabled={!signedUrl || zoom >= 3}
                  >
                    +
                  </button>
                  <button className={topButtonClass} onClick={() => requestPageChange(page - 1)} disabled={page <= 1}>
                    이전
                  </button>
                  <button className={topButtonClass} onClick={() => requestPageChange(page + 1)}>
                    다음
                  </button>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {!activeMaterialId ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">왼쪽에서 PDF를 선택해줘.</div>
              ) : loadingFileUrl ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">파일 URL 준비중...</div>
              ) : !signedUrl ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">PDF 주소를 불러오지 못함</div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => requestPageChange(page - 1)}
                    disabled={page <= 1}
                    className={`${arrowButtonClass} left-3`}
                    title="이전 페이지"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => requestPageChange(page + 1)}
                    className={`${arrowButtonClass} right-3`}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-500">PDF 로딩중...</div>
                  )}

                  {viewerState === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-4 text-sm text-red-600">{viewerError || "PDF를 불러오지 못함"}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hidden items-stretch justify-center lg:flex">
          <div className="w-[2px] rounded-full bg-slate-300/90" />
        </div>

        <div className="min-h-0 pl-0 lg:pl-2">
          <div className={`${panelClass} flex h-full min-h-0 flex-col`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">사용자 기록</div>
              <button onClick={handleSaveNote} className={topButtonClass}>저장</button>
            </div>

            <textarea
              className="min-h-0 flex-1 w-full resize-none rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              placeholder="현재 페이지에 대한 메모"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
