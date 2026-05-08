"use client";

import { useRouter } from "next/navigation";
import Grade_List from "./grade_list";
import Subject_List from "./subject_list";
import Material_List from "./material_list";
import AddSubject from "./addsubject";
import DeleteSubject from "./del_subjcet";

type Grade = { id: string; year: number; term: number | null };
type Subject = { id: string; name: string; gradeId: string };
type Material = { id: string; week: number; title: string };

export default function Combi({
  grades,
  subjects,
  materials,
  selectedGradeId,
  selectedSubjectId,
}: {
  grades: Grade[];
  subjects: Subject[];
  materials: Material[];
  selectedGradeId?: string;
  selectedSubjectId?: string;
}) {
  const router = useRouter();

  const setGrade = (gradeId: string) => {
    router.push(`/subject?gradeId=${gradeId}`);
  };

  const setSubject = (subjectId: string) => {
    if (!selectedGradeId) return;
    router.push(`/subject?gradeId=${selectedGradeId}&subjectId=${subjectId}`);
  };

  const openMaterialRecord = (materialId: string) => {
    if (!selectedGradeId || !selectedSubjectId) return;
    router.push(
      `/record?gradeId=${selectedGradeId}&subjectId=${selectedSubjectId}&materialId=${materialId}`
    );
  };

  async function uploadMaterial(file: File): Promise<{ ok: boolean; error?: string }> {
    if (!selectedSubjectId) {
      return { ok: false, error: "먼저 과목을 선택해주세요." };
    }

    if (file.type !== "application/pdf") {
      return { ok: false, error: "PDF 파일만 업로드할 수 있어요." };
    }

    const nextWeek = materials.length === 0 ? 1 : Math.max(...materials.map((m) => m.week)) + 1;
    const titleInput = window.prompt("자료 이름", `${nextWeek}주차 자료`) ?? "";
    const finalTitle = titleInput.trim() || `${nextWeek}주차 자료`;
    const weekInput = window.prompt("몇 주차 자료인지 입력하세요", String(nextWeek)) ?? "";
    const finalWeek = Math.max(1, Number(weekInput) || nextWeek);

    const form = new FormData();
    form.append("subjectId", selectedSubjectId);
    form.append("week", String(finalWeek));
    form.append("title", finalTitle);
    form.append("file", file);

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { ok: false, error: data?.error ?? `업로드 실패 (${res.status})` };
      }

      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "업로드 중 네트워크 오류가 발생했습니다." };
    }
  }

  return (
    <div className="bg-slate-50 px-3 py-3 text-slate-900 sm:px-4">
      <div className="mx-auto flex h-[calc(100vh-110px)] max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <h1 className="text-base font-semibold tracking-tight text-slate-900">Subject</h1>
          <div className="flex flex-wrap gap-2">
            <AddSubject selectedGradeId={selectedGradeId} />
            <DeleteSubject selectedSubjectId={selectedSubjectId} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
          <Grade_List
            grades={grades}
            selectedGradeId={selectedGradeId}
            onSelect={setGrade}
          />

          <Subject_List
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelect={setSubject}
          />

          <Material_List
            materials={materials}
            selectedSubjectId={selectedSubjectId}
            onOpenMaterial={openMaterialRecord}
            onUploadMaterial={uploadMaterial}
          />
        </div>
      </div>
    </div>
  );
}
