"use client";

import { useRouter } from "next/navigation";

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

export default function QuizSetList(props: { quizSets: QuizSetCard[]; returnTo: string }) {
  const router = useRouter();

  if (props.quizSets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        퀴즈가 없습니다. <b>Create Quiz</b> 를 눌러 생성해보세요
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {props.quizSets.map((q) => {
        const a = q.latestAttempt;
        const isInProgress = a?.status === "IN_PROGRESS";
        const isSubmitted = a?.status === "SUBMITTED" || a?.status === "GRADED";
        const canStartOrResume = !a || isInProgress;
        const takeLabel = !a ? "풀기" : isInProgress ? "이어 풀기" : "Retake";
        const canSeeResult = isSubmitted;

        return (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{q.title ?? "Quiz"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {q.itemCount} 문제 - {new Date(q.createdAt).toLocaleString()}
                </div>

                {a ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {a.status}
                    {a.score != null && a.maxScore != null ? ` - ${a.score}/${a.maxScore}` : ""}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">아직 풀지 않음</div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  onClick={() =>
                    router.push(
                      `/quiz/take/${q.id}?mode=resume&returnTo=${encodeURIComponent(props.returnTo)}`
                    )
                  }
                  disabled={!canStartOrResume}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  {takeLabel}
                </button>

                <button
                  onClick={() =>
                    a && router.push(`/quiz/result/${a.id}?returnTo=${encodeURIComponent(props.returnTo)}`)
                  }
                  disabled={!canSeeResult || !a}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  결과
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
