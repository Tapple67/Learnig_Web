"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

type QuizItem = {
  id: string;
  order: number;
  type: "mcq" | "tf" | "short" | string;
  question: string;
  choices: any;
  points: number;
  explanation?: string | null;
  answerKey: any;
};

type AnswerRow = {
  quizItemId: string;
  response: any;
  isCorrect: boolean | null;
  earned: number | null;
  feedback?: string | null;
};

export default function QuizResultPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [attempt, setAttempt] = useState<any>(null);
  const [idx, setIdx] = useState(0);

  const sp = useSearchParams();
  const returnTo = sp.get("returnTo") || "/quiz";

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const res = await fetch(`/api/attempt/result?attemptId=${attemptId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(data?.error ?? "결과 불러오기 실패");
        }
        setAttempt(data.attempt);
        setIdx(0);
      } catch (e: any) {
        setMsg(e?.message ?? "오류");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, router]);

  const items: QuizItem[] = attempt?.quizSet?.items ?? [];
  const answers: AnswerRow[] = attempt?.answers ?? [];

  const answerMap = useMemo(() => {
    const map = new Map<string, AnswerRow>();
    for (const a of answers) map.set(a.quizItemId, a);
    return map;
  }, [answers]);

  const current = items[idx] ?? null;
  const currentAnswer = current ? (answerMap.get(current.id) ?? null) : null;

  function goPrev() {
    setIdx((p) => Math.max(0, p - 1));
  }

  function goNext() {
    setIdx((p) => Math.min(items.length - 1, p + 1));
  }

  function goBackToList() {
    const [path, query = ""] = returnTo.split("?");
    const params = new URLSearchParams(query);
    params.set("_r", String(Date.now()));
    const qs = params.toString();
    router.replace(qs ? `${path}?${qs}` : path);
  }

  function formatShortMyAnswer(a: AnswerRow | null) {
    const t = typeof a?.response?.text === "string" ? a.response.text.trim() : "";
    return t || "미응답";
  }

  function formatShortCorrectAnswer(item: QuizItem) {
    const accepted = Array.isArray(item.answerKey?.accepted) ? item.answerKey.accepted : [];
    if (accepted.length === 0) return "정답 정보 없음";
    const show = accepted.slice(0, 4);
    return show.join(" / ") + (accepted.length > show.length ? " ..." : "");
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">로딩 중...</div>;
  if (msg) return <div className="p-6 text-sm text-red-600">{msg}</div>;
  if (!attempt || !current) return <div className="p-6 text-sm">데이터 없음</div>;

  const maxScore = attempt?.maxScore ?? 0;
  const score = attempt?.score ?? 0;
  const isCorrect = currentAnswer?.isCorrect ?? null;
  const earned = currentAnswer?.earned ?? 0;

  const selectedIndex = typeof currentAnswer?.response?.selectedIndex === "number" ? currentAnswer.response.selectedIndex : null;
  const correctIndex = typeof current?.answerKey?.correctIndex === "number" ? current.answerKey.correctIndex : null;
  const selectedTF = typeof currentAnswer?.response?.value === "boolean" ? currentAnswer.response.value : null;
  const correctTF = typeof current?.answerKey?.correct === "boolean" ? current.answerKey.correct : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-112px)] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">{attempt.quizSet?.title ?? "퀴즈 결과"}</div>
            <div className="text-sm text-slate-300">점수 {score} / {maxScore} | {idx + 1}/{items.length}</div>
          </div>
          <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={goBackToList}>돌아가기</button>
        </div>

        <div className="mt-6 flex-1 overflow-auto rounded-xl bg-emerald-950/60 p-6 text-emerald-50">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{current.order}. ({current.points}점)</div>
            <div className="text-sm">{isCorrect === true ? "정답" : isCorrect === false ? "오답" : "-"} <span className="ml-2 opacity-90">{earned}/{current.points}점</span></div>
          </div>

          <div className="mt-2 text-base font-medium leading-relaxed">{current.question}</div>

          {current.type === "mcq" && Array.isArray(current.choices) && (
            <div className="mt-5 space-y-2">
              {(current.choices as string[]).map((c, i) => {
                const cls =
                  isCorrect === false && i === selectedIndex
                    ? "border-red-400 bg-red-500/15"
                    : isCorrect === false && i === correctIndex
                    ? "border-blue-400 bg-blue-500/15"
                    : isCorrect === true && i === selectedIndex
                    ? "border-violet-400 bg-violet-500/20"
                    : "border-slate-600 bg-slate-900/40";
                return (
                  <div key={i} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed text-slate-100 ${cls}`}>
                    <div className="w-7 shrink-0 text-right opacity-90">{i + 1}.</div>
                    <div>{c}</div>
                  </div>
                );
              })}
            </div>
          )}

          {current.type === "tf" && (
            <div className="mt-5 flex gap-3">
              {[{ label: "O", value: true }, { label: "X", value: false }].map((opt) => {
                const cls =
                  isCorrect === false && selectedTF === opt.value
                    ? "border-red-400 bg-red-500/15"
                    : isCorrect === false && correctTF === opt.value
                    ? "border-blue-400 bg-blue-500/15"
                    : isCorrect === true && selectedTF === opt.value
                    ? "border-violet-400 bg-violet-500/20"
                    : "border-slate-600 bg-slate-900/40";
                return (
                  <div key={opt.label} className={`min-w-[80px] rounded-lg border px-4 py-3 text-center text-sm text-slate-100 ${cls}`}>
                    {opt.label}
                  </div>
                );
              })}
            </div>
          )}

          {current.type === "short" && (
            <div className="mt-6 grid gap-3">
              <div className="rounded-lg bg-slate-900/60 p-4">
                <div className="mb-1 text-xs text-slate-300">내 답변</div>
                <div className="whitespace-pre-wrap text-sm text-white">{formatShortMyAnswer(currentAnswer)}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-4">
                <div className="mb-1 text-xs text-slate-300">정답(채점 기준)</div>
                <div className="whitespace-pre-wrap text-sm text-white">{formatShortCorrectAnswer(current)}</div>
              </div>
            </div>
          )}

          {(current.explanation || currentAnswer?.feedback) && (
            <div className="mt-6 grid gap-3">
              {current.explanation && (
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <div className="mb-1 text-xs text-slate-300">해설</div>
                  <div className="whitespace-pre-wrap text-sm text-white">{current.explanation}</div>
                </div>
              )}
              {currentAnswer?.feedback && (
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <div className="mb-1 text-xs text-slate-300">피드백</div>
                  <div className="whitespace-pre-wrap text-sm text-white">{currentAnswer.feedback}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={goPrev} disabled={idx <= 0} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40">이전</button>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="rounded-md bg-slate-700 px-3 py-1">{idx + 1}</span>
            <span>/</span>
            <span className="rounded-md bg-slate-700 px-3 py-1">{items.length}</span>
          </div>
          <button onClick={goNext} disabled={idx >= items.length - 1} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40">다음</button>
        </div>
      </div>
    </div>
  );
}
