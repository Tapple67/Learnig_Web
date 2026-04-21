"use client";

import { useRef, useState } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import { useMaterials } from "./hooks/useMaterials";
import { useNotes } from "./hooks/useNotes";
import { useQuiz } from "./hooks/useQuiz";
import { usePdf } from "./hooks/usePdf";

export default function Page() {
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const materialsHook = useMaterials();
  const notes = useNotes(materialsHook.activeMaterialId, page);
  const quiz = useQuiz(materialsHook.activeMaterialId);
  const pdf = usePdf(materialsHook.activeMaterialId, setMsg);

  async function requestPageChange(nextPage: number) {
    if (nextPage < 1) return;

    if (notes.dirty) {
      await notes.saveNote();
    }

    setPage(nextPage);
  }

  async function uploadPdf(file: File) {
    if (!materialsHook.selectedSubjectId) {
      setMsg("과목을 먼저 선택해줘");
      return;
    }

    if (file.type !== "application/pdf") {
      setMsg("PDF만 업로드 가능해");
      return;
    }

    const nextWeek =
      materialsHook.materials.length === 0
        ? 1
        : Math.max(...materialsHook.materials.map((m) => m.week)) + 1;

    const title = window.prompt("자료 이름", `${nextWeek}주차 자료`) ?? "";
    const finalTitle = title.trim() || `${nextWeek}주차 자료`;

    const weekInput =
      window.prompt("몇 주차 자료인지 입력해줘", String(nextWeek)) ?? "";
    const finalWeek = Math.max(1, Number(weekInput) || nextWeek);

    const form = new FormData();
    form.append("subjectId", materialsHook.selectedSubjectId);
    form.append("week", String(finalWeek));
    form.append("title", finalTitle);
    form.append("file", file);

    setMsg("");

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error ?? `업로드 실패 (${res.status})`);
        return;
      }

      await materialsHook.reloadMaterials(
        materialsHook.selectedSubjectId,
        data?.id
      );
      setPage(1);
    } catch {
      setMsg("업로드 중 네트워크 오류");
    }
  }

  function handleSelectMaterial(materialId: string) {
    materialsHook.setActiveMaterialId(materialId);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      

      <div className="flex gap-4 p-4">
        <aside
          className={`shrink-0 transition-all duration-300 ${
            sidebarOpen ? "w-[290px]" : "w-[88px]"
          }`}
        >
          <div className="h-[calc(100vh-108px)] rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="h-full p-3">
              <LeftPanel
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                grades={materialsHook.grades}
                selectedGradeId={materialsHook.selectedGradeId}
                setSelectedGradeId={materialsHook.setSelectedGradeId}
                subjects={materialsHook.subjects}
                selectedSubjectId={materialsHook.selectedSubjectId}
                setSelectedSubjectId={materialsHook.setSelectedSubjectId}
                materials={materialsHook.materials}
                activeMaterialId={materialsHook.activeMaterialId}
                onSelectMaterial={handleSelectMaterial}
                fileInputRef={fileInputRef}
                uploadPdf={uploadPdf}
              />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {msg && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
              {msg}
            </div>
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <RightPanel
              activeMaterialId={materialsHook.activeMaterialId}
              signedUrl={pdf.signedUrl}
              loadingFileUrl={pdf.loadingFileUrl}
              page={page}
              requestPageChange={requestPageChange}
              content={notes.content}
              setContent={notes.setContent}
              setDirty={notes.setDirty}
              saveNote={notes.saveNote}
              createQuiz={quiz.createQuiz}
              quizLoading={quiz.quizLoading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}