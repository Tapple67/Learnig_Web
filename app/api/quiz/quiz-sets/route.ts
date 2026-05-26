import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { assertMaterialOwnedByUser, assertQuizSetOwnedByUser } from "@/lib/authz";
import { generateAndSaveQuiz } from "@/app/(main)/quiz/hooks/use_quiz";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type AttemptCard = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
};

function pickLatestAttempt(attempts: AttemptCard[]) {
  const submitted = attempts.find((a) => a.status === "GRADED" || a.status === "SUBMITTED");
  return submitted ?? attempts[0] ?? null;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const materialId = String(body?.materialId ?? "").trim();
  if (!materialId) return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });

  try {
    await assertMaterialOwnedByUser({ userId, materialId });

    const spec = body?.spec ?? undefined;
    const result = await generateAndSaveQuiz({ materialId, spec });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e, "퀴즈 생성 실패") }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = String(searchParams.get("materialId") ?? "").trim();
  if (!materialId) return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });

  try {
    await assertMaterialOwnedByUser({ userId, materialId });

    const quizSets = await prisma.quizSet.findMany({
      where: { materialId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        createdAt: true,
        items: { select: { id: true } },
        attempts: {
          where: { userId },
          orderBy: [{ startedAt: "desc" }],
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            submittedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      quizSets: quizSets.map((q) => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt,
        itemCount: q.items.length,
        latestAttempt: pickLatestAttempt(q.attempts),
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e, "목록 조회 실패") }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quizSetId = String(body?.quizSetId ?? "").trim();
  const title = String(body?.title ?? "").trim();

  if (!quizSetId) return NextResponse.json({ error: "quizSetId가 필요합니다." }, { status: 400 });
  if (!title || title.length > 100) {
    return NextResponse.json({ error: "퀴즈 제목은 1~100자여야 합니다." }, { status: 400 });
  }

  try {
    await assertQuizSetOwnedByUser({ userId, quizSetId });

    const quizSet = await prisma.quizSet.update({
      where: { id: quizSetId },
      data: { title },
      select: { id: true, title: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, quizSet });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e, "퀴즈 수정 실패") }, { status: 403 });
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quizSetId = String(body?.quizSetId ?? "").trim();

  if (!quizSetId) return NextResponse.json({ error: "quizSetId가 필요합니다." }, { status: 400 });

  try {
    await assertQuizSetOwnedByUser({ userId, quizSetId });

    await prisma.$transaction([
      prisma.activityLog.deleteMany({ where: { userId, materialId: quizSetId } }),
      prisma.quizSet.delete({ where: { id: quizSetId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e, "퀴즈 삭제 실패") }, { status: 403 });
  }
}
