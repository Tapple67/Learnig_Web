"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          // 필요하면 개수 조절
          spec: { mcqCount: 2, tfCount: 1, shortCount: 1 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 생성 실패");

      // generateAndSaveQuiz()가 { quizSetId } 반환하도록 해둔 상태
      router.push(`/quiz/take/${data.quizSetId}`);
    } catch (e: any) {
      setMsg(e?.message ?? "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <div className="text-xl font-semibold">퀴즈 만들기</div>
      <div className="text-sm text-gray-600">materialId: {materialId}</div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}

      <button
        onClick={createQuiz}
        disabled={loading}
        className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "생성 중..." : "퀴즈 생성"}
      </button>

      <div className="text-xs text-gray-500">
        지금은 StubProvider라 퀴즈가 더미로 생성됩니다. UI/흐름 검증용.
      </div>
    </div>
  );
}