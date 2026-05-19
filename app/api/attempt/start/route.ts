// app/api/attempt/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { assertQuizSetOwnedByUser } from "@/lib/authz";
import { logQuizActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quizSetId = String(body?.quizSetId ?? "");
  if (!quizSetId) return NextResponse.json({ error: "quizSetId 필요" }, { status: 400 });

  try {
    await assertQuizSetOwnedByUser({ userId, quizSetId });

    // 1) 진행중 있으면 이어풀기
    const inProgress = await prisma.quizAttempt.findFirst({
      where: { userId, quizSetId, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true, status: true },
    });

    let attemptId: string;

    if (inProgress) {
      attemptId = inProgress.id;
    } else {
      // 2) 제출된 적 있으면 재시작 불가
      const submitted = await prisma.quizAttempt.findFirst({
        where: { userId, quizSetId, status: { in: ["SUBMITTED", "GRADED"] } },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });

      if (submitted) {
        return NextResponse.json(
          {
            error: "제출된 퀴즈는 다시 풀 수 없습니다. (새 퀴즈를 생성하세요.)",
            code: "ALREADY_SUBMITTED",
          },
          { status: 409 }
        );
      }

      // 3) 시도 자체가 없으면 첫 시작: 새 attempt 생성
      const created = await prisma.quizAttempt.create({
        data: { userId, quizSetId, status: "IN_PROGRESS" },
        select: { id: true },
      });
      attemptId = created.id;
    }

    // 퀴즈셋 + 문항
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
    if (!quizSet) return NextResponse.json({ error: "퀴즈 없음" }, { status: 404 });

    // 기존 저장 답 복원
    const existingAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId },
      select: { quizItemId: true, response: true, updatedAt: true },
    });

    await logQuizActivity({ userId, quizSetId });
    return NextResponse.json({ attemptId, quizSet, existingAnswers });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "시작 실패" }, { status: 403 });
  }
}
