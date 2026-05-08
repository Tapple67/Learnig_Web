import { prisma } from "@/lib/db";
import { getAIProvider } from "@/ai";
import { ensureMaterialSummary } from "@/services/summaryService";
import { buildMaterialPacket } from "@/lib/materialPacket";
import { Prisma } from "@prisma/client";

function normalizePointsTo100(source: Array<{ points?: number }>): number[] {
  const count = source.length;
  if (count === 0) return [];

  const TOTAL = 100;

  if (count >= TOTAL) {
    return source.map(() => 1);
  }

  const weights = source.map((it) => {
    const v = Number(it.points ?? 1);
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  const points = new Array(count).fill(1);
  const remaining = TOTAL - count;
  const sumWeights = weights.reduce((a, b) => a + b, 0);

  const rawExtra = weights.map((w) => (w / sumWeights) * remaining);
  const flooredExtra = rawExtra.map((x) => Math.floor(x));

  for (let i = 0; i < count; i++) {
    points[i] += flooredExtra[i];
  }

  const left = remaining - flooredExtra.reduce((a, b) => a + b, 0);
  const remainders = rawExtra
    .map((x, i) => ({ i, frac: x - flooredExtra[i] }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < left; k++) {
    points[remainders[k % count].i] += 1;
  }

  return points;
}

export async function generateAndSaveQuiz(params: {
  materialId: string;
  spec?: { mcqCount: number; tfCount: number; shortCount: number };
}) {
  const spec = params.spec ?? { mcqCount: 5, tfCount: 3, shortCount: 2 };

  const { summaryId, sourceHash, content } = await ensureMaterialSummary(params.materialId);
  const packet = await buildMaterialPacket(params.materialId);
  const notes = packet.pages
    .filter((p) => p.note.length > 0)
    .map((p) => ({ page: p.page, note: p.note, signals: p.noteSignals }));

  const ai = getAIProvider();
  const quiz = await ai.generateQuiz({ summary: content, notes, spec });

  if (!quiz?.items?.length) throw new Error("Quiz items empty");

  const normalizedPoints = normalizePointsTo100(quiz.items);

  const itemsToCreate = quiz.items.map((it, idx) => {
    const base = {
      order: idx + 1,
      type: it.type,
      question: it.question,
      answerKey: it.answerKey as Prisma.InputJsonValue,
      explanation: it.explanation ?? "",
      topic: it.topic?.trim() || "기타 개념",
      points: normalizedPoints[idx],
      evidence: (it.evidence ?? null) as Prisma.InputJsonValue | null,
      signalHits: (it.signalHits ?? []) as Prisma.InputJsonValue,
    };

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
