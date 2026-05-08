"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_QUIZ_SPEC } from "@/lib/quizSpec";

export default function QuizForMaterialPage({ params }: { params: { materialId: string } }) {
  const router = useRouter();
  const materialId = params.materialId;

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function createQuiz() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/quiz/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId,
          // 필요하면 lib/quizSpec.ts 에서 기본 개수를 조절
          spec: DEFAULT_QUIZ_SPEC,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 생성 실패");

      router.push(`/quiz/take/${data.quizSetId}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "오류";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <div className="text-xl font-semibold">퀴즈 만들기</div>
      <div className="text-sm text-gray-600">materialId: {materialId}</div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}

      <button
        onClick={createQuiz}
        disabled={loading}
        className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "생성 중.." : "퀴즈 생성"}
      </button>

      <div className="text-xs text-gray-500">
        현재는 퀴즈 생성 흐름 검증용 페이지입니다.
      </div>
    </div>
  );
}
