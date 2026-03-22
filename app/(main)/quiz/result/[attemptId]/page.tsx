"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

export default function QuizResultPage({ params }: { params: { attemptId: string } }) {
  const router = useRouter();
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
        if (!res.ok) throw new Error(data?.error ?? "결과 불러오기 실패");
        setAttempt(data.attempt);
        setIdx(0);
      } catch (e: any) {
        setMsg(e?.message ?? "오류");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const items: QuizItem[] = attempt?.quizSet?.items ?? [];
  const answers: AnswerRow[] = attempt?.answers ?? [];

  const answerMap = useMemo(() => {
    const map = new Map<string, AnswerRow>();
    for (const a of answers) map.set(a.quizItemId, a);
    return map;
  }, [answers]);

  const current = items[idx] ?? null;
  const currentAnswer = current ? (answerMap.get(current.id) ?? null) : null;

  const maxScore = attempt?.maxScore ?? 0;
  const score = attempt?.score ?? 0;

  function goPrev() {
    setIdx((p) => Math.max(0, p - 1));
  }
  function goNext() {
    setIdx((p) => Math.min(items.length - 1, p + 1));
  }

  // ---- short(서술형)은 그대로 "텍스트"로 표시하기 위한 헬퍼 ----
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

  function formatShortMyAnswer(a: AnswerRow | null) {
    const resp = a?.response ?? null;
    const t = typeof resp?.text === "string" ? resp.text.trim() : "";
    return t ? t : "미응답";
  }

  function formatShortCorrectAnswer(item: QuizItem) {
    const ak = item.answerKey ?? {};
    const accepted = Array.isArray(ak.accepted) ? ak.accepted : [];
    if (accepted.length === 0) return "정답 정보 없음";
    const show = accepted.slice(0, 4);
    return show.join(" / ") + (accepted.length > show.length ? " ..." : "");
  }

  // ---- MCQ/TF 색상 클래스 계산 ----
  function mcqChoiceClass(params: {
    choiceIndex: number;
    selectedIndex: number | null;
    correctIndex: number | null;
    isCorrect: boolean | null;
  }) {
    const { choiceIndex, selectedIndex, correctIndex, isCorrect } = params;

    const base =
      "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed transition";
    const neutral = "border-slate-600 bg-slate-900/40 text-slate-100";

    // 미응답이면 전부 기본
    if (selectedIndex === null || correctIndex === null) return `${base} ${neutral}`;

    // 정답이면: 내가 선택한 것(=정답)을 보라색
    if (isCorrect === true) {
      if (choiceIndex === selectedIndex) {
        return `${base} border-violet-400 bg-violet-500/20 text-violet-100`;
      }
      return `${base} ${neutral}`;
    }

    // 오답이면:
    // - 내가 선택한 것: 빨강
    // - 정답: 파랑
    if (choiceIndex === selectedIndex) {
      return `${base} border-red-400 bg-red-500/15 text-red-100`;
    }
    if (choiceIndex === correctIndex) {
      return `${base} border-blue-400 bg-blue-500/15 text-blue-100`;
    }
    return `${base} ${neutral}`;
  }

  function tfChoiceClass(params: {
    value: boolean;
    selected: boolean | null;
    correct: boolean | null;
    isCorrect: boolean | null;
  }) {
    const base =
      "flex items-center justify-center rounded-lg border px-4 py-3 text-sm transition min-w-[80px]";
    const neutral = "border-slate-600 bg-slate-900/40 text-slate-100";

    if (params.selected === null || params.correct === null) return `${base} ${neutral}`;

    if (params.isCorrect === true) {
      // 선택한 것이 보라색
      if (params.selected === params.value) {
        return `${base} border-violet-400 bg-violet-500/20 text-violet-100`;
      }
      return `${base} ${neutral}`;
    }

    // 오답: 내 선택=빨강, 정답=파랑
    if (params.selected === params.value) {
      return `${base} border-red-400 bg-red-500/15 text-red-100`;
    }
    if (params.correct === params.value) {
      return `${base} border-blue-400 bg-blue-500/15 text-blue-100`;
    }
    return `${base} ${neutral}`;
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">로딩 중...</div>;
  if (msg) return <div className="p-6 text-sm text-red-600">{msg}</div>;
  if (!attempt || !current) return <div className="p-6 text-sm">데이터 없음</div>;

  const isCorrect = currentAnswer?.isCorrect ?? null;
  const earned = currentAnswer?.earned ?? 0;

  // 사용자 응답 파싱
  const selectedIndex =
    typeof currentAnswer?.response?.selectedIndex === "number"
      ? currentAnswer.response.selectedIndex
      : null;

  const correctIndex =
    typeof current?.answerKey?.correctIndex === "number" ? current.answerKey.correctIndex : null;

  const selectedTF =
    typeof currentAnswer?.response?.value === "boolean" ? currentAnswer.response.value : null;

  const correctTF =
    typeof current?.answerKey?.correct === "boolean" ? current.answerKey.correct : null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow">
        {/* 상단 요약 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">
              {attempt.quizSet?.title ?? "퀴즈 결과"}
            </div>
            <div className="text-sm text-slate-300">
              점수 {score} / {maxScore} · {idx + 1}/{items.length}
            </div>
          </div>

            <button className="text-sm text-slate-300" onClick={() => router.replace(returnTo)}>돌아가기</button>
        </div>

        {/* 문제 카드(한 문제씩) */}
        <div className="mt-6 rounded-xl bg-emerald-950/60 p-6 text-emerald-50">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">
              {current.order}. ({current.points}점)
            </div>
            <div className="text-sm">
              {isCorrect === true ? " 정답" : isCorrect === false ? " 오답" : ""}
              <span className="ml-2 opacity-90">
                {earned}/{current.points}점
              </span>
            </div>
          </div>

          <div className="mt-2 text-base font-medium leading-relaxed">{current.question}</div>

          {/*  MCQ: 박스 제거하고 보기 자체를 색으로 표시 */}
          {current.type === "mcq" && Array.isArray(current.choices) && (
            <div className="mt-5 space-y-2">
              {(current.choices as string[]).map((c, i) => (
                <div
                  key={i}
                  className={mcqChoiceClass({
                    choiceIndex: i,
                    selectedIndex,
                    correctIndex,
                    isCorrect,
                  })}
                >
                  <div className="w-7 shrink-0 text-right opacity-90">{i + 1}.</div>
                  <div>{c}</div>

                  {/* 우측 마커(선택/정답 표시) */}
                  <div className="ml-auto text-xs opacity-90">
                    {selectedIndex === i && isCorrect === true && "선택(정답)"}
                    {selectedIndex === i && isCorrect === false && "내 선택"}
                    {correctIndex === i && isCorrect === false && "정답"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*  OX(tf): 동일 처리 */}
          {current.type === "tf" && (
            <div className="mt-5 flex gap-3">
              <div
                className={tfChoiceClass({
                  value: true,
                  selected: selectedTF,
                  correct: correctTF,
                  isCorrect,
                })}
              >
                O
              </div>
              <div
                className={tfChoiceClass({
                  value: false,
                  selected: selectedTF,
                  correct: correctTF,
                  isCorrect,
                })}
              >
                X
              </div>
            </div>
          )}

          {/*  서술형(short): 기존처럼 박스로 유지 */}
          {current.type === "short" && (
            <div className="mt-6 grid gap-3">
              <div className="rounded-lg bg-slate-900/60 p-4">
                <div className="text-xs text-slate-300 mb-1">내 답</div>
                <div className="text-sm text-white whitespace-pre-wrap">
                  {formatShortMyAnswer(currentAnswer)}
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/60 p-4">
                <div className="text-xs text-slate-300 mb-1">정답(채점 기준)</div>
                <div className="text-sm text-white whitespace-pre-wrap">
                  {formatShortCorrectAnswer(current)}
                </div>
              </div>
            </div>
          )}

          {/* 해설/피드백: 타입 상관 없이 하단에 */}
          {(current.explanation || currentAnswer?.feedback) && (
            <div className="mt-6 grid gap-3">
              {current.explanation && (
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <div className="text-xs text-slate-300 mb-1">해설</div>
                  <div className="text-sm text-white whitespace-pre-wrap">
                    {current.explanation}
                  </div>
                </div>
              )}

              {currentAnswer?.feedback && (
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <div className="text-xs text-slate-300 mb-1">피드백</div>
                  <div className="text-sm text-white whitespace-pre-wrap">
                    {currentAnswer.feedback}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 네비 */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={idx <= 0}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            이전
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="rounded-md bg-slate-700 px-3 py-1">{idx + 1}</span>
            <span>/</span>
            <span className="rounded-md bg-slate-700 px-3 py-1">{items.length}</span>
          </div>

          <button
            onClick={goNext}
            disabled={idx >= items.length - 1}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}