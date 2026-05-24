"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import { useMaterials } from "./hooks/use_materials";
import { useNotes } from "./hooks/use_notes";
import { usePdf } from "./hooks/use_pdf";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const materialsHook = useMaterials();
  const notes = useNotes(materialsHook.activeMaterialId, page);
  const pdf = usePdf(materialsHook.activeMaterialId, setMsg);

  useEffect(() => {
    if (!materialsHook.activeMaterialId) return;
    void fetch("/api/activity/record-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId: materialsHook.activeMaterialId }),
    }).catch(() => {});
  }, [materialsHook.activeMaterialId]);

  async function requestPageChange(nextPage: number) {
    if (nextPage < 1) return;
    if (notes.dirty) await notes.saveNote();
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

    const weekInput = window.prompt("몇 주차 자료인지 입력해줘", String(nextWeek)) ?? "";
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

      await materialsHook.reloadMaterials(materialsHook.selectedSubjectId, data?.id);
      setPage(1);
    } catch {
      setMsg("업로드 중 네트워크 오류");
    }
  }

  function handleSelectMaterial(materialId: string) {
    materialsHook.setActiveMaterialId(materialId);
    setPage(1);
  }

  function handleGoBack() {
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push("/subject");
  }

  return (
    <div className="h-[calc(100vh-52px)] bg-[#f5f7fb] text-slate-900">
      <div className="h-full p-3">
        {msg && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
            {msg}
          </div>
        )}

        <div className="h-full min-w-0">
          <main className="h-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <RightPanel
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
              onGoSubject={handleGoBack}
              activeMaterialId={materialsHook.activeMaterialId}
              signedUrl={pdf.signedUrl}
              loadingFileUrl={pdf.loadingFileUrl}
              page={page}
              requestPageChange={requestPageChange}
              content={notes.content}
              setContent={notes.setContent}
              setDirty={notes.setDirty}
              saveNote={notes.saveNote}
            />
          </main>

          {sidebarOpen && (
            <>
              <button
                type="button"
                aria-label="사이드바 닫기 배경"
                className="fixed inset-0 z-30 bg-transparent"
                onClick={() => setSidebarOpen(false)}
              />
              <aside className="fixed left-3 top-[64px] z-40 h-[calc(100vh-76px)] w-[320px] rounded-lg border border-slate-200 bg-white p-3 shadow-2xl">
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
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
