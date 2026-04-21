"use client";

import { RefObject } from "react";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string };

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

  grades: Grade[];
  selectedGradeId: string;
  setSelectedGradeId: (id: string) => void;

  subjects: Subject[];
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;

  materials: Material[];
  activeMaterialId: string;
  onSelectMaterial: (id: string) => void;

  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadPdf: (file: File) => void;
};

export default function LeftPanel({
  sidebarOpen,
  setSidebarOpen,
  grades,
  selectedGradeId,
  setSelectedGradeId,
  subjects,
  selectedSubjectId,
  setSelectedSubjectId,
  materials,
  activeMaterialId,
  onSelectMaterial,
  fileInputRef,
  uploadPdf,
}: Props) {
  const controlClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-300";
  const iconButtonClass =
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

  if (!sidebarOpen) {
    return (
      <div className="flex h-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50"
          title="사이드바 열기"
        >
          ☰
        </button>

        <select
          className={`${controlClass} px-2 text-center`}
          value={selectedGradeId}
          onChange={(e) => setSelectedGradeId(e.target.value)}
          title="학기 선택"
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.year}-{g.term}
            </option>
          ))}
        </select>

        <select
          className={`${controlClass} px-2 text-center`}
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          title="과목 선택"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => fileInputRef.current?.click()}
          title="PDF 업로드"
        >
          +
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.currentTarget.value = "";
            if (file) uploadPdf(file);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            className={controlClass}
            value={selectedGradeId}
            onChange={(e) => setSelectedGradeId(e.target.value)}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.year}-{g.term}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={iconButtonClass}
            title="사이드바 닫기"
          >
            ☰
          </button>
        </div>

        <div className="flex gap-2">
          <select
            className={controlClass}
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={iconButtonClass}
            onClick={() => fileInputRef.current?.click()}
            title="PDF 업로드"
          >
            +
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.currentTarget.value = "";
              if (file) uploadPdf(file);
            }}
          />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 rounded-[20px] border border-slate-200 bg-[#fafbfd] p-3">
        <div className="mb-3 text-sm font-semibold text-slate-800">업로드된 자료</div>

        {materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
            아직 업로드된 PDF가 없어.
          </div>
        ) : (
          <div className="space-y-2 overflow-auto pr-1">
            {materials.map((m) => {
              const active = activeMaterialId === m.id;

              return (
                <div
                  key={m.id}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? "border-slate-900 bg-[#0f172a] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => onSelectMaterial(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMaterial(m.id);
                    }
                  }}
                >
                  <div className="font-semibold">{m.title}</div>
                  <div
                    className={`mt-1 text-xs ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {m.week}주차
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}