import { prisma } from "@/lib/db";

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const tokenize = (s: string) =>
  norm(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);

type AnswerKey = {
  correctIndex?: unknown;
  correct?: unknown;
  accepted?: unknown;
};

type QuizResponse = {
  selectedIndex?: unknown;
  value?: unknown;
  text?: unknown;
};

function asQuizResponse(response: unknown): QuizResponse {
  return response && typeof response === "object" ? response : {};
}

function asAnswerKey(answerKey: unknown): AnswerKey {
  return answerKey && typeof answerKey === "object" ? answerKey : {};
}

function gradeOne(item: { type: string; points: number; answerKey: unknown }, response: unknown) {
  const pts = item.points ?? 1;
  const answerKey = asAnswerKey(item.answerKey);
  const responseValue = asQuizResponse(response);

  if (item.type === "mcq") {
    const correctIndex = Number(answerKey.correctIndex);
    const selectedIndex = responseValue.selectedIndex;
    const ok =
      Number.isFinite(correctIndex) &&
      typeof selectedIndex === "number" &&
      selectedIndex === correctIndex;
    return { isCorrect: ok, earned: ok ? pts : 0 };
  }

  if (item.type === "tf") {
    const correct = Boolean(answerKey.correct);
    const value = responseValue.value;
    const ok = typeof value === "boolean" && value === correct;
    return { isCorrect: ok, earned: ok ? pts : 0 };
  }

  if (item.type === "short") {
    const accepted: string[] = Array.isArray(answerKey.accepted) ? answerKey.accepted : [];
    const text = typeof responseValue.text === "string" ? responseValue.text : "";
    const textNorm = norm(text);
    const exact = accepted.map(norm).some((a) => a === textNorm);

    // 1차 규칙 채점: exact가 아니면 핵심 키워드 포함률로 보정
    let keywordMatch = false;
    if (!exact && textNorm) {
      const answerKeywords = new Set(
        accepted.flatMap((a) => tokenize(a)).filter((k) => k.length >= 2)
      );
      const responseKeywords = new Set(tokenize(textNorm));
      if (answerKeywords.size > 0 && responseKeywords.size > 0) {
        let hit = 0;
        for (const k of answerKeywords) {
          if (responseKeywords.has(k)) hit += 1;
        }
        const ratio = hit / answerKeywords.size;
        keywordMatch = ratio >= 0.6 || hit >= 2;
      }
    }

    const ok = exact || keywordMatch;
    return { isCorrect: ok, earned: ok ? pts : 0 };
  }

  return { isCorrect: false, earned: 0 };
}

export async function gradeAttempt(params: { attemptId: string; userId: string }) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: params.attemptId, userId: params.userId },
    select: {
      id: true,
      status: true,
      quizSet: {
        select: {
          items: {
            orderBy: { order: "asc" },
            select: { id: true, type: true, points: true, answerKey: true },
          },
        },
      },
      answers: { select: { quizItemId: true, response: true } },
    },
  });

  if (!attempt) throw new Error("권한 없음(시도)");
  if (attempt.status !== "IN_PROGRESS") throw new Error("이미 제출됨");

  const answerMap = new Map(attempt.answers.map((a) => [a.quizItemId, a.response]));

  let rawScore = 0;
  let rawMaxScore = 0;

  const graded = attempt.quizSet.items.map((it) => {
    const resp = answerMap.get(it.id) ?? null;
    const pts = it.points ?? 1;
    rawMaxScore += pts;

    const r = gradeOne({ type: it.type, points: pts, answerKey: it.answerKey }, resp);
    rawScore += r.earned;

    return { quizItemId: it.id, response: resp ?? {}, ...r };
  });

  const maxScore = rawMaxScore > 0 ? 100 : 0;
  const score = rawMaxScore > 0 ? Math.round((rawScore / rawMaxScore) * 100) : 0;

  await prisma.$transaction(async (tx) => {
    for (const g of graded) {
      await tx.quizAnswer.upsert({
        where: { attemptId_quizItemId: { attemptId: attempt.id, quizItemId: g.quizItemId } },
        update: { response: g.response, isCorrect: g.isCorrect, earned: g.earned },
        create: { attemptId: attempt.id, quizItemId: g.quizItemId, response: g.response, isCorrect: g.isCorrect, earned: g.earned },
      });
    }

    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "GRADED",
        submittedAt: new Date(),
        gradedAt: new Date(),
        score,
        maxScore,
      },
    });
  });

  return { attemptId: attempt.id, score, maxScore };
}
