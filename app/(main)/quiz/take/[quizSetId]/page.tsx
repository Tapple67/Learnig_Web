"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/app/components/ui/Modal";

type QuizItemClient = {
  id: string;
  order: number;
  type: "mcq" | "tf" | "short" | string;
  question: string;
  choices: any;
  topic: string;
  points: number;
};

type AnswerState =
  | { type: "mcq"; selectedIndex: number | null }
  | { type: "tf"; value: boolean | null }
  | { type: "short"; text: string };

type ExistingAnswerRow = {
  quizItemId: string;
  response: any;
};

type StartAttemptResponse = {
  attemptId: string;
  quizSet: { id: string; title: string | null; items: QuizItemClient[] };
  existingAnswers?: ExistingAnswerRow[];
};

export default function TakeQuizPage({ params }: { params: { quizSetId: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const quizSetId = params.quizSetId;

  const returnTo = sp.get("returnTo") || "/quiz";
  const mode = sp.get("mode") || "resume";

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<QuizItemClient[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [idx, setIdx] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = items[idx] ?? null;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      try {
        const res = await fetch("/api/attempt/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizSetId, mode }),
        });

        const data: StartAttemptResponse = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          if (res.status === 409) {
            setMsg((data as any)?.error ?? "진행 중인 퀴즈가 없습니다.");
            setAttemptId("");
            setTitle(null);
            setItems([]);
            setAnswers({});
            return;
          }
          throw new Error((data as any)?.error ?? "퀴즈 시작 실패");
        }

        setAttemptId(data.attemptId);
        setTitle(data.quizSet.title);
        setItems(data.quizSet.items);
        setIdx(0);

        const map = new Map<string, any>();
        for (const a of data.existingAnswers ?? []) map.set(a.quizItemId, a.response);

        const init: Record<string, AnswerState> = {};
        for (const it of data.quizSet.items) {
          const saved = map.get(it.id);
          if (it.type === "mcq") {
            init[it.id] = { type: "mcq", selectedIndex: typeof saved?.selectedIndex === "number" ? saved.selectedIndex : null };
          } else if (it.type === "tf") {
            init[it.id] = { type: "tf", value: typeof saved?.value === "boolean" ? saved.value : null };
          } else {
            init[it.id] = { type: "short", text: typeof saved?.text === "string" ? saved.text : "" };
          }
        }
        setAnswers(init);
      } catch (e: any) {
        setMsg(e?.message ?? "오류");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizSetId, mode, router]);

  const maxScore = useMemo(() => items.reduce((a, it) => a + (it.points ?? 1), 0), [items]);

  async function persistCurrent() {
    if (!attemptId || !current) return;
    const a = answers[current.id];
    if (!a) return;

    let response: any = {};
    if (a.type === "mcq") response = { selectedIndex: a.selectedIndex };
    if (a.type === "tf") response = { value: a.value };
    if (a.type === "short") response = { text: a.text };

    const res = await fetch("/api/attempt/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, quizItemId: current.id, response }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      throw new Error(data?.error ?? "답안 저장 실패");
    }
  }

  async function goPrev() {
    if (!current || idx <= 0 || submitting) return;
    try {
      await persistCurrent();
      setIdx((p) => Math.max(0, p - 1));
    } catch (e: any) {
      setMsg(e?.message ?? "오류");
    }
  }

  async function goNext() {
    if (!current || idx >= items.length - 1 || submitting) return;
    try {
      await persistCurrent();
      setIdx((p) => Math.min(items.length - 1, p + 1));
    } catch (e: any) {
      setMsg(e?.message ?? "오류");
    }
  }

  async function submitConfirmed() {
    if (!attemptId || submitting) return;
    setConfirmSubmitOpen(false);
    setSubmitting(true);
    setMsg("");

    try {
      if (current) await persistCurrent();
      const res = await fetch("/api/attempt/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error(data?.error ?? "제출 실패");
      }
      router.replace(`/quiz/result/${attemptId}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "오류");
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = useMemo(() => {
    let c = 0;
    for (const it of items) {
      const a = answers[it.id];
      if (!a) continue;
      if (a.type === "mcq" && a.selectedIndex !== null) c++;
      else if (a.type === "tf" && a.value !== null) c++;
      else if (a.type === "short" && a.text.trim().length > 0) c++;
    }
    return c;
  }, [answers, items]);

  if (loading) return <div className="p-6 text-sm text-gray-600">로딩 중...</div>;

  if (!current) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-800 p-6 text-slate-100">
          <div className="text-lg font-semibold">퀴즈를 시작할 수 없습니다.</div>
          <div className="mt-2 text-sm text-slate-300">{msg || "진행 중인 퀴즈가 없습니다."}</div>
          <button onClick={() => router.push(returnTo)} className="mt-6 rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-900 hover:bg-white">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const a = answers[current.id];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-112px)] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">{title ?? "퀴즈"}</div>
            <div className="text-sm text-slate-300">
              {idx + 1} / {items.length} | 진행 {answeredCount}/{items.length} | 총점 {maxScore}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.replace(returnTo)} disabled={submitting} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40">목록</button>
            <button onClick={() => setConfirmSubmitOpen(true)} disabled={submitting} className="rounded-lg bg-slate-200 px-4 py-2 text-sm hover:bg-white disabled:opacity-50">제출</button>
          </div>
        </div>

        {msg && <div className="mt-3 text-sm text-red-300">{msg}</div>}

        <div className="mt-6 flex-1 overflow-auto rounded-xl bg-emerald-950/60 p-6 text-emerald-50">
          <div className="mb-2 text-sm opacity-90">{current.order}. ({current.points}점)</div>
          <div className="text-base font-medium leading-relaxed">{current.question}</div>

          <div className="mt-5 space-y-3">
            {current.type === "mcq" && Array.isArray(current.choices) && (
              <div className="space-y-2">
                {(current.choices as string[]).map((c, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name={`mcq-${current.id}`}
                      checked={(a as any)?.selectedIndex === i}
                      onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: { type: "mcq", selectedIndex: i } }))}
                    />
                    <span className="leading-relaxed">{c}</span>
                  </label>
                ))}
              </div>
            )}

            {current.type === "tf" && (
              <div className="flex gap-6 text-sm">
                {[{ label: "O", value: true }, { label: "X", value: false }].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`tf-${current.id}`}
                      checked={(a as any)?.value === opt.value}
                      onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: { type: "tf", value: opt.value } }))}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {current.type === "short" && (
              <textarea
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-white"
                placeholder="답을 입력하세요"
                value={(a as any)?.text ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: { type: "short", text: e.target.value } }))}
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={goPrev} disabled={idx <= 0 || submitting} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40">이전</button>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="rounded-md bg-slate-700 px-3 py-1">{idx + 1}</span>
            <span>/</span>
            <span className="rounded-md bg-slate-700 px-3 py-1">{items.length}</span>
          </div>
          <button onClick={goNext} disabled={idx >= items.length - 1 || submitting} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40">다음</button>
        </div>
      </div>

      <Modal
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="제출 확인"
        footer={
          <>
            <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setConfirmSubmitOpen(false)} disabled={submitting}>취소</button>
            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50" onClick={submitConfirmed} disabled={submitting}>제출</button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-sm text-gray-700">제출하시겠습니까?</div>
          <div className="text-xs text-gray-500">제출 후 채점 결과 화면으로 이동합니다.</div>
        </div>
      </Modal>
    </div>
  );
}
