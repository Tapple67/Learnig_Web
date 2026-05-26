import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { assertQuizSetOwnedByUser } from "@/lib/authz";
import { logQuizActivity } from "@/lib/activity";

export const runtime = "nodejs";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function getOrCreateAttempt(params: { userId: string; quizSetId: string }) {
  const { userId, quizSetId } = params;

  for (let i = 0; i < 3; i++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const submitted = await tx.quizAttempt.findFirst({
            where: { userId, quizSetId, status: { in: ["SUBMITTED", "GRADED"] } },
            orderBy: { startedAt: "desc" },
            select: { id: true },
          });

          if (submitted) {
            await tx.quizAttempt.deleteMany({
              where: { userId, quizSetId, status: "IN_PROGRESS" },
            });
            return { attemptId: submitted.id, alreadySubmitted: true };
          }

          const inProgress = await tx.quizAttempt.findFirst({
            where: { userId, quizSetId, status: "IN_PROGRESS" },
            orderBy: { startedAt: "desc" },
            select: { id: true },
          });

          if (inProgress) {
            return { attemptId: inProgress.id, alreadySubmitted: false };
          }

          const created = await tx.quizAttempt.create({
            data: { userId, quizSetId, status: "IN_PROGRESS" },
            select: { id: true },
          });

          return { attemptId: created.id, alreadySubmitted: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error: unknown) {
      if (isRetryableTransactionError(error) && i < 2) continue;
      throw error;
    }
  }

  throw new Error("퀴즈 시작 실패");
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quizSetId = String(body?.quizSetId ?? "").trim();
  if (!quizSetId) return NextResponse.json({ error: "quizSetId가 필요합니다." }, { status: 400 });

  try {
    await assertQuizSetOwnedByUser({ userId, quizSetId });

    const attempt = await getOrCreateAttempt({ userId, quizSetId });
    if (attempt.alreadySubmitted) {
      return NextResponse.json(
        {
          error: "이미 제출한 퀴즈입니다.",
          code: "ALREADY_SUBMITTED",
          attemptId: attempt.attemptId,
        },
        { status: 409 }
      );
    }

    const quizSet = await prisma.quizSet.findUnique({
      where: { id: quizSetId },
      select: {
        id: true,
        title: true,
        items: {
          orderBy: { order: "asc" },
          select: { id: true, order: true, type: true, question: true, choices: true, topic: true, points: true },
        },
      },
    });
    if (!quizSet) return NextResponse.json({ error: "퀴즈가 없습니다." }, { status: 404 });

    const existingAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: attempt.attemptId },
      select: { quizItemId: true, response: true, updatedAt: true },
    });

    await logQuizActivity({ userId, quizSetId });
    return NextResponse.json({ attemptId: attempt.attemptId, quizSet, existingAnswers });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e, "퀴즈 시작 실패") }, { status: 403 });
  }
}
