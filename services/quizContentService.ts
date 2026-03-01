import { prisma } from "@/lib/db";
import { getAIProvider } from "@/ai";
import { ensureMaterialSummary } from "@/services/summaryService";
import { Prisma } from "@prisma/client";

export async function generateAndSaveQuiz(params: {
  materialId: string;
  spec?: { mcqCount: number; tfCount: number; shortCount: number };
}) {
  const spec = params.spec ?? { mcqCount: 5, tfCount: 3, shortCount: 2 };

  // ✅ 최신 summary 확보(없으면 생성/있으면 재사용)
  const { summaryId, sourceHash, content } = await ensureMaterialSummary(params.materialId);

  const ai = getAIProvider();
  const quiz = await ai.generateQuiz({ summary: content, spec });

  if (!quiz?.items?.length) throw new Error("Quiz items empty");

  const itemsToCreate = quiz.items.map((it, idx) => {
  const base = {
    order: idx + 1,
    type: it.type,
    question: it.question,
    answerKey: it.answerKey as Prisma.InputJsonValue,
    explanation: it.explanation ?? "",
    points: it.points ?? 1,
  };

  // ✅ choices가 있으면만 넣기 (undefined는 OK)
  return it.choices ? { ...base, choices: it.choices as Prisma.InputJsonValue } : base;
});

  const saved = await prisma.$transaction(async (tx) => {
    const quizSet = await tx.quizSet.create({
      data: {
        materialId: params.materialId,
        summaryId,
        sourceHash,
        title: quiz.title ?? null,
        provider: quiz.provider,
        model: quiz.model,
        promptVersion: quiz.promptVersion,
        items: { create: itemsToCreate },
      },
      select: { id: true, createdAt: true },
    });
    return quizSet;
  });

  return { quizSetId: saved.id, createdAt: saved.createdAt, summaryId, sourceHash };
}