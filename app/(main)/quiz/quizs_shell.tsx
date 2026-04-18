"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Selectors from "./selectors";
import QuizSetList from "./quiz_list";
import Modal from "@/app/components/ui/modal";
import MaterialStatsModal from "@/app/(main)/stats/material_stats_modal";

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
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [createdChoiceOpen, setCreatedChoiceOpen] = useState(false);
  const [createdQuizSetId, setCreatedQuizSetId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

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
    const g = context.grade ? `${context.grade.year}-${context.grade.term}` : "No Grade";
    const s = context.subject?.name ?? "No Subject";
    const m = context.material ? `${context.material.week}w ${context.material.title}` : "No File";
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
      if (!res.ok) throw new Error(data?.error ?? "Quiz creation failed");

      setCreatedQuizSetId(String(data.quizSetId));
      setCreatedChoiceOpen(true);
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
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
    router.refresh();
  }

  return (
    <div className="bg-slate-50 px-3 py-3 text-slate-900 sm:px-4">
      <div className="mx-auto flex h-[calc(100vh-110px)] max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <div className="truncate text-xs text-slate-500">{breadcrumb}</div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Quiz</h1>
          </div>

          <button
            onClick={() => setStatsOpen(true)}
            disabled={!selected.materialId}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            통계
          </button>

          <button
            onClick={() => setConfirmCreateOpen(true)}
            disabled={!selected.materialId || creating}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "생성중..." : "퀴즈 생성"}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
          <aside className="min-h-0 lg:col-span-4">
            <Selectors
              grades={grades}
              subjects={subjects}
              materials={materials}
              selected={selected}
              onSelectGrade={(gradeId) => pushWith({ gradeId, subjectId: undefined, materialId: undefined })}
              onSelectSubject={(subjectId) =>
                pushWith({ gradeId: selected.gradeId, subjectId, materialId: undefined })
              }
              onSelectMaterial={(materialId) =>
                pushWith({ gradeId: selected.gradeId, subjectId: selected.subjectId, materialId })
              }
            />
          </aside>

          <main className="min-h-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-8">
            {msg && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}

            <div className="h-full min-h-0 overflow-auto">
              {!selected.materialId ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  파일을 선택하세요.
                </div>
              ) : (
                <QuizSetList quizSets={quizSets} returnTo={returnTo} />
              )}
            </div>
          </main>
        </div>
      </div>

      <Modal
        open={confirmCreateOpen}
        onClose={() => setConfirmCreateOpen(false)}
        title="Create Quiz"
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
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
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
          <div className="text-sm text-gray-700">새 퀴즈를 생성하시겠습니까?</div>
          <div className="text-xs text-gray-500">즉시 풀거나 나중에 풀 수 있습니다.</div>
        </div>
      </Modal>

      <Modal
        open={createdChoiceOpen}
        onClose={() => setCreatedChoiceOpen(false)}
        title="Quiz Created"
        footer={
          <>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={stayHere}
              disabled={creating}
            >
              나중에 풀기
            </button>
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={goTakeNow}
              disabled={creating || !createdQuizSetId}
            >
              시작하기
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-sm text-gray-700">퀴즈가 생성되었습니다.</div>
          <div className="text-xs text-gray-500">지금 풀거나 나중에 풀수 있습니다.</div>
        </div>
      </Modal>

      <MaterialStatsModal
      materialId={selected.materialId ?? ""}
      open={statsOpen}
      onClose={() => setStatsOpen(false)}
      />
    </div>
  );
}
