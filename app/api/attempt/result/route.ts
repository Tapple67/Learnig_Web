import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get("attemptId") ?? "";
  if (!attemptId) return NextResponse.json({ error: "attemptId 필요" }, { status: 400 });

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
              id: true, order: true, type: true,
              question: true, choices: true, points: true,
              explanation: true,
              answerKey: true, // 결과 화면에서 정답 표시 필요하면 사용
            },
          },
        },
      },
      answers: {
        select: { quizItemId: true, response: true, isCorrect: true, earned: true, feedback: true },
      },
    },
  });

  if (!attempt) return NextResponse.json({ error: "없음/권한 없음" }, { status: 404 });

  return NextResponse.json({ attempt });
}