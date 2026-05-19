import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get("attemptId") ?? "";
  if (!attemptId) return NextResponse.json({ error: "attemptId가 필요합니다." }, { status: 400 });

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      gradedAt: true,
      quizSet: {
        select: {
          id: true,
          title: true,
          items: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              type: true,
              question: true,
              choices: true,
              points: true,
              topic: true,
              explanation: true,
              answerKey: true,
            },
          },
        },
      },
      answers: {
        select: { quizItemId: true, response: true, isCorrect: true, earned: true, feedback: true },
      },
    },
  });

  if (!attempt) return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });

  if (attempt.status !== "SUBMITTED" && attempt.status !== "GRADED") {
    return NextResponse.json({ error: "아직 제출되지 않은 퀴즈입니다." }, { status: 400 });
  }

  return NextResponse.json({ attempt });
}
