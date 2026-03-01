import { prisma } from "@/lib/db";

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function gradeOne(item: { type: string; points: number; answerKey: any }, response: any) {
  const pts = item.points ?? 1;

  if (item.type === "mcq") {
    const correctIndex = Number(item.answerKey?.correctIndex);
    const selectedIndex = Number(response?.selectedIndex);
    const ok = Number.isFinite(correctIndex) && selectedIndex === correctIndex;
    return { isCorrect: ok, earned: ok ? pts : 0 };
  }

  if (item.type === "tf") {
    const correct = Boolean(item.answerKey?.correct);
    const value = Boolean(response?.value);
    const ok = value === correct;
    return { isCorrect: ok, earned: ok ? pts : 0 };
  }

  if (item.type === "short") {
    const accepted: string[] = Array.isArray(item.answerKey?.accepted) ? item.answerKey.accepted : [];
    const text = typeof response?.text === "string" ? response.text : "";
    const ok = accepted.map(norm).some((a) => a === norm(text));
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

  let score = 0;
  let maxScore = 0;

  const graded = attempt.quizSet.items.map((it) => {
    const resp = answerMap.get(it.id) ?? null;
    const pts = it.points ?? 1;
    maxScore += pts;

    const r = gradeOne({ type: it.type, points: pts, answerKey: it.answerKey }, resp);
    score += r.earned;

    return { quizItemId: it.id, response: resp ?? {}, ...r };
  });

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