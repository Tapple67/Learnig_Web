import type { QuizFocus } from "@/ai/types";
import { prisma } from "@/lib/db";

export const QUIZ_PURPOSES = ["GENERAL", "WRONG_REVIEW", "WEAK_TOPIC"] as const;

export type QuizPurpose = (typeof QUIZ_PURPOSES)[number];

export type QuizFocusResult = {
  focus?: QuizFocus;
  sourceTopics: string[];
  sourceItemIds: string[];
  preferredPages: number[];
};

export function asTopicList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function asEvidencePage(evidence: unknown) {
  if (!evidence || typeof evidence !== "object") return null;
  const page = Number((evidence as { page?: unknown }).page);
  return Number.isInteger(page) && page > 0 ? page : null;
}

async function buildWrongReviewFocus(params: {
  userId: string;
  materialId: string;
  sourceAttemptId: string;
}): Promise<QuizFocusResult> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      id: params.sourceAttemptId,
      userId: params.userId,
      status: { in: ["SUBMITTED", "GRADED"] },
      quizSet: { materialId: params.materialId },
    },
    select: {
      id: true,
      answers: {
        where: { isCorrect: false },
        select: {
          quizItemId: true,
          item: {
            select: {
              id: true,
              question: true,
              topic: true,
              explanation: true,
              evidence: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error("Review source attempt was not found.");

  const wrongItems = attempt.answers.map((answer) => ({
    id: answer.item.id,
    question: answer.item.question,
    topic: answer.item.topic?.trim() || "General concept",
    explanation: answer.item.explanation,
    evidence: answer.item.evidence,
  }));

  if (wrongItems.length === 0) {
    throw new Error("There are no wrong answers to review.");
  }

  const sourceTopics = asTopicList(wrongItems.map((item) => item.topic));
  const preferredPages = wrongItems
    .map((item) => asEvidencePage(item.evidence))
    .filter((page): page is number => page !== null);

  return {
    focus: {
      kind: "WRONG_REVIEW",
      topics: sourceTopics,
      wrongItems: wrongItems.map((item) => ({
        question: item.question,
        topic: item.topic,
        explanation: item.explanation,
        evidence: item.evidence,
      })),
    },
    sourceTopics,
    sourceItemIds: wrongItems.map((item) => item.id),
    preferredPages,
  };
}

export async function resolveQuizFocus(params: {
  userId?: string;
  materialId: string;
  purpose: QuizPurpose;
  sourceAttemptId?: string;
  sourceTopics?: string[];
}): Promise<QuizFocusResult> {
  if (!QUIZ_PURPOSES.includes(params.purpose)) {
    throw new Error("Unsupported quiz purpose.");
  }

  if (params.purpose === "WRONG_REVIEW") {
    if (!params.userId || !params.sourceAttemptId) {
      throw new Error("sourceAttemptId is required for wrong-answer review quizzes.");
    }

    return buildWrongReviewFocus({
      userId: params.userId,
      materialId: params.materialId,
      sourceAttemptId: params.sourceAttemptId,
    });
  }

  if (params.purpose === "WEAK_TOPIC") {
    const sourceTopics = asTopicList(params.sourceTopics);
    if (sourceTopics.length === 0) {
      throw new Error("sourceTopics is required for weak-topic quizzes.");
    }

    return {
      focus: { kind: "WEAK_TOPIC", topics: sourceTopics },
      sourceTopics,
      sourceItemIds: [],
      preferredPages: [],
    };
  }

  return {
    sourceTopics: asTopicList(params.sourceTopics),
    sourceItemIds: [],
    preferredPages: [],
  };
}
