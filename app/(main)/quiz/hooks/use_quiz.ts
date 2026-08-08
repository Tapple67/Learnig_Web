import { prisma } from "@/lib/db";
import { getAIProvider } from "@/ai";
import { DEFAULT_QUIZ_SPEC } from "@/app/(main)/quiz/constants";
import { ensureMaterialSummary } from "@/app/(main)/quiz/hooks/use_summary";
import { resolveQuizFocus, type QuizPurpose } from "@/app/(main)/quiz/hooks/use_quiz_focus";
import { buildMaterialPacket } from "@/app/(main)/quiz/utils/material_packet";
import { Prisma } from "@prisma/client";

const QUIZ_SOURCE_TEXT_LIMIT = 2000;
const FALLBACK_SOURCE_PAGE_LIMIT = 3;

function truncateForQuizContext(text: string, limit = QUIZ_SOURCE_TEXT_LIMIT) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

function buildQuizSourcePages(
  packet: Awaited<ReturnType<typeof buildMaterialPacket>>,
  preferredPages: number[] = []
) {
  const notePages = packet.pages.filter((p) => p.note.trim().length > 0);
  const wantedPages = new Set<number>();

  for (const page of preferredPages) {
    wantedPages.add(page);
    wantedPages.add(page - 1);
    wantedPages.add(page + 1);
  }

  for (const p of notePages) {
    wantedPages.add(p.page);
    wantedPages.add(p.page - 1);
    wantedPages.add(p.page + 1);
  }

  const selected =
    wantedPages.size > 0
      ? packet.pages.filter((p) => wantedPages.has(p.page))
      : packet.pages.filter((p) => p.pdfText.trim().length > 0).slice(0, FALLBACK_SOURCE_PAGE_LIMIT);

  return selected
    .filter((p) => p.page > 0 && (p.pdfText.trim().length > 0 || p.note.trim().length > 0))
    .map((p) => ({
      page: p.page,
      pdfText: truncateForQuizContext(p.pdfText),
      note: p.note,
      signals: p.noteSignals,
    }));
}

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
  userId?: string;
  materialId: string;
  spec?: { mcqCount: number; tfCount: number; shortCount: number };
  purpose?: QuizPurpose;
  sourceAttemptId?: string;
  sourceTopics?: string[];
}) {
  const spec = params.spec ?? DEFAULT_QUIZ_SPEC;
  const purpose = params.purpose ?? "GENERAL";
  const { focus, sourceTopics, sourceItemIds, preferredPages } = await resolveQuizFocus({
    userId: params.userId,
    materialId: params.materialId,
    purpose,
    sourceAttemptId: params.sourceAttemptId,
    sourceTopics: params.sourceTopics,
  });

  const { summaryId, sourceHash, content, packet } = await ensureMaterialSummary(params.materialId);
  const notes = packet.pages
    .filter((p) => p.note.length > 0)
    .map((p) => ({ page: p.page, note: p.note, signals: p.noteSignals }));
  const sourcePages = buildQuizSourcePages(packet, preferredPages);

  const ai = getAIProvider();
  const quiz = await ai.generateQuiz({ summary: content, notes, sourcePages, spec, focus });

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
      evidence:
        it.evidence == null
          ? Prisma.JsonNull
          : (it.evidence as Prisma.InputJsonValue),
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

    await tx.$executeRaw`
      UPDATE "QuizSet"
      SET
        "purpose" = ${purpose},
        "sourceAttemptId" = ${params.sourceAttemptId ?? null},
        "sourceTopics" = CAST(${sourceTopics.length > 0 ? JSON.stringify(sourceTopics) : null} AS jsonb),
        "sourceItemIds" = CAST(${sourceItemIds.length > 0 ? JSON.stringify(sourceItemIds) : null} AS jsonb)
      WHERE "id" = ${quizSet.id}
    `;
    return quizSet;
  });

  return { quizSetId: saved.id, createdAt: saved.createdAt, summaryId, sourceHash };
}
