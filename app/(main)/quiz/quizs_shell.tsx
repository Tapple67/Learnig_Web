// app/quiz/QuizShell.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Selectors from "./selectors";
import QuizSetList from "./quiz_list";
import Modal from "@/app/components/ui/modal";

type Grade = { id: string; year: number; term: number; isCurrent: boolean };
type Subject = { id: string; name: string; isCurrent: boolean; gradeId: string };
type Material = { id: string; week: number; title: string; createdAt: Date; subjectId: string };

type QuizSetCard = {
  id: string;
  title: string | null;
  createdAt: string;
  itemCount: number;
  latestAttempt: null | {
    id: string;
    status: string;
    score: number | null;
    maxScore: number | null;
    startedAt: string;
    submittedAt: string | null;
  };
};

export default function QuizShell(props: {
  grades: Grade[];
  subjects: Subject[];
  materials: Material[];
  quizSets: QuizSetCard[];
  selected: { gradeId?: string; subjectId?: string; materialId?: string };
  context: { grade: Grade | null; subject: Subject | null; material: Material | null };
}) {
  const router = useRouter();
  const { grades, subjects, materials, quizSets, selected, context } = props;

  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ 1) 생성 확인 모달
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);

  // ✅ 2) 생성 완료 후(바로 풀기/목록에서 보기) 모달
  const [createdChoiceOpen, setCreatedChoiceOpen] = useState(false);
  const [createdQuizSetId, setCreatedQuizSetId] = useState<string | null>(null);

  function pushWith(next: { gradeId?: string; subjectId?: string; materialId?: string }) {
    const p = new URLSearchParams();
    if (next.gradeId) p.set("gradeId", next.gradeId);
    if (next.subjectId) p.set("subjectId", next.subjectId);
    if (next.materialId) p.set("materialId", next.materialId);
    router.push(`/quiz?${p.toString()}`);
  }

  const returnTo = useMemo(() => {
    const p = new URLSearchParams();
    if (selected.gradeId) p.set("gradeId", selected.gradeId);
    if (selected.subjectId) p.set("subjectId", selected.subjectId);
    if (selected.materialId) p.set("materialId", selected.materialId);
    const qs = p.toString();
    return qs ? `/quiz?${qs}` : "/quiz";
  }, [selected.gradeId, selected.subjectId, selected.materialId]);

  const breadcrumb = useMemo(() => {
    const g = context.grade ? `${context.grade.year}-${context.grade.term}` : "학기 미선택";
    const s = context.subject?.name ?? "과목 미선택";
    const m = context.material ? `${context.material.week}주차 · ${context.material.title}` : "파일 미선택";
    return `${g} > ${s} > ${m}`;
  }, [context.grade, context.subject, context.material]);

  async function createQuizSet() {
    if (!selected.materialId || creating) return;

    setCreating(true);
    setMsg("");

    try {
      const res = await fetch("/api/quiz/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selected.materialId,
          spec: { mcqCount: 5, tfCount: 2, shortCount: 1 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 생성 실패");

      setCreatedQuizSetId(String(data.quizSetId));
      setCreatedChoiceOpen(true);
    } catch (e: any) {
      setMsg(e?.message ?? "오류");
    } finally {
      setCreating(false);
    }
  }

  function goTakeNow() {
    if (!createdQuizSetId) return;
    setCreatedChoiceOpen(false);
    router.push(`/quiz/take/${createdQuizSetId}?mode=resume&returnTo=${encodeURIComponent(returnTo)}`);
  }

  function stayHere() {
    setCreatedChoiceOpen(false);
    setCreatedQuizSetId(null);
    // ✅ SSR 목록 새로고침
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-64px)] grid grid-cols-12">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3 border-r bg-white">
        <div className="p-4 border-b">
          <div className="text-lg font-semibold">퀴즈</div>
          <div className="text-xs text-gray-500 mt-1">학기 → 과목 → 파일</div>
        </div>

        <Selectors
          grades={grades}
          subjects={subjects}
          materials={materials}
          selected={selected}
          onSelectGrade={(gradeId) => pushWith({ gradeId, subjectId: undefined, materialId: undefined })}
          onSelectSubject={(subjectId) => pushWith({ gradeId: selected.gradeId, subjectId, materialId: undefined })}
          onSelectMaterial={(materialId) =>
            pushWith({ gradeId: selected.gradeId, subjectId: selected.subjectId, materialId })
          }
        />
      </aside>

      <main className="col-span-12 md:col-span-8 lg:col-span-9 bg-gray-50">
        <div className="p-4 border-b bg-white flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">{breadcrumb}</div>
            <div className="text-xl font-semibold mt-1">퀴즈 목록</div>
          </div>

          {/* ✅ 버튼 누르면 “생성 확인 모달” */}
          <button
            onClick={() => setConfirmCreateOpen(true)}
            disabled={!selected.materialId || creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "생성 중..." : "새 퀴즈 생성"}
          </button>
        </div>

        {msg && <div className="p-4 text-sm text-red-600">{msg}</div>}

        <div className="p-4">
          {!selected.materialId ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
              왼쪽에서 파일(Material)을 선택하면 해당 파일의 퀴즈 목록이 표시됩니다.
            </div>
          ) : (
            <QuizSetList quizSets={quizSets} returnTo={returnTo} />
          )}
        </div>
      </main>

      {/* ✅ (1) 생성 확인 모달 */}
      <Modal
        open={confirmCreateOpen}
        onClose={() => setConfirmCreateOpen(false)}
        title="퀴즈 생성"
        footer={
          <>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setConfirmCreateOpen(false)}
              disabled={creating}
            >
              취소
            </button>
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={async () => {
                setConfirmCreateOpen(false);
                await createQuizSet();
              }}
              disabled={creating || !selected.materialId}
            >
              생성
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-sm text-gray-700">퀴즈를 생성하시겠습니까?</div>
          <div className="text-xs text-gray-500">생성 후 바로 풀거나 목록에서 확인할 수 있습니다.</div>
        </div>
      </Modal>

      {/* ✅ (2) 생성 완료 후 선택 모달 */}
      <Modal
        open={createdChoiceOpen}
        onClose={() => setCreatedChoiceOpen(false)}
        title="퀴즈 생성 완료"
        footer={
          <>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={stayHere}
              disabled={creating}
            >
              목록에서 보기
            </button>
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={goTakeNow}
              disabled={creating || !createdQuizSetId}
            >
              바로 풀기
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-sm text-gray-700">퀴즈가 생성되었습니다.</div>
          <div className="text-xs text-gray-500">지금 풀거나 목록에서 확인할 수 있습니다.</div>
        </div>
      </Modal>
    </div>
  );
}