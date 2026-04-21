"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useQuiz(activeMaterialId: string) {
  const [quizLoading, setQuizLoading] = useState(false);
  const router = useRouter();

  async function createQuiz() {
    if (!activeMaterialId) return;

    try {
      setQuizLoading(true);

      const res = await fetch("/api/quiz/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId: activeMaterialId,
          spec: { mcqCount: 2, tfCount: 1, shortCount: 1 },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.quizSetId) {
        alert(data?.error ?? "퀴즈 생성 실패");
        return;
      }

      router.push(`/quiz/take/${data.quizSetId}`);
    } finally {
      setQuizLoading(false);
    }
  }

  return {
    createQuiz,
    quizLoading,
  };
}