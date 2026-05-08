"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_QUIZ_SPEC } from "@/lib/quizSpec";

export function useQuiz(activeMaterialId: string) {
  const [quizLoading, setQuizLoading] = useState(false);
  const router = useRouter();

  async function createQuiz(options?: { beforeCreate?: () => Promise<void> | void }) {
    if (!activeMaterialId) return;

    try {
      setQuizLoading(true);
      await options?.beforeCreate?.();

      const res = await fetch("/api/quiz/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId: activeMaterialId,
          spec: DEFAULT_QUIZ_SPEC,
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
