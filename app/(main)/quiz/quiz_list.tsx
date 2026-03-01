// app/quiz/QuizSetList.tsx
"use client";

import { useRouter } from "next/navigation";

type QuizSetCard = {
  id: string;
  title: string | null;
  createdAt: string;
  itemCount: number;
  latestAttempt: null | {
    id: string;
    status: string; // IN_PROGRESS | SUBMITTED | GRADED
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
      <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
        아직 생성된 퀴즈가 없습니다. 상단의 <b>새 퀴즈 생성</b> 버튼을 눌러보세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.quizSets.map((q) => {
        const a = q.latestAttempt;

        const isInProgress = a?.status === "IN_PROGRESS";
        const isSubmitted = a?.status === "SUBMITTED" || a?.status === "GRADED";

        // ✅ attempt가 없으면 "첫 시작" 가능
        // ✅ IN_PROGRESS면 이어풀기 가능
        // ✅ SUBMITTED/GRADED면 다시 풀기 불가
        const canStartOrResume = !a || isInProgress;

        const takeLabel = !a ? "풀기" : isInProgress ? "이어풀기" : "풀기";

        const canSeeResult = isSubmitted; // 제출/채점된 attempt만 결과 보기

        return (
          <div key={q.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">{q.title ?? "퀴즈"}</div>
                <div className="mt-1 text-xs text-gray-600">
                  문항 {q.itemCount} · 생성 {new Date(q.createdAt).toLocaleString()}
                </div>

                {a ? (
                  <div className="mt-2 text-xs text-gray-600">
                    내 최근 상태: {a.status}
                    {a.score != null && a.maxScore != null ? ` · ${a.score}/${a.maxScore}` : ""}
                    {" · "}
                    {new Date(a.startedAt).toLocaleString()}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">
                    아직 시도가 없습니다. (처음 풀기 버튼을 눌러 시작)
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* ✅ 풀기(첫 시작) / 이어풀기 */}
                <button
                  onClick={() =>
                    router.push(
                      `/quiz/take/${q.id}?mode=resume&returnTo=${encodeURIComponent(props.returnTo)}`
                    )
                  }
                  disabled={!canStartOrResume}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
                  title={
                    !canStartOrResume
                      ? "제출된 퀴즈는 다시 풀 수 없습니다. 새 퀴즈를 생성하세요."
                      : ""
                  }
                >
                  {takeLabel}
                </button>

                {/* ✅ 결과/해설 (제출/채점된 것만) */}
                <button
                  onClick={() =>
                    a && router.push(`/quiz/result/${a.id}?returnTo=${encodeURIComponent(props.returnTo)}`)
                  }
                  disabled={!canSeeResult || !a}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
                >
                  결과/해설
                </button>
              </div>
            </div>

            {/* ✅ 제출된 건 안내 */}
            {isSubmitted && (
              <div className="mt-3 text-xs text-gray-500">
                제출된 퀴즈는 다시 풀 수 없습니다. 필요하면 상단에서 <b>새 퀴즈 생성</b>을 해주세요.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}