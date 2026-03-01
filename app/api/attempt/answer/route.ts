import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const attemptId = String(body?.attemptId ?? "");
  const quizItemId = String(body?.quizItemId ?? "");
  const response = body?.response;

  if (!attemptId || !quizItemId || response == null) {
    return NextResponse.json({ error: "attemptId, quizItemId, response 필요" }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { id: true, status: true, quizSetId: true },
  });
  if (!attempt) return NextResponse.json({ error: "권한 없음(시도)" }, { status: 403 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "이미 제출됨" }, { status: 409 });

  const item = await prisma.quizItem.findFirst({
    where: { id: quizItemId, quizSetId: attempt.quizSetId },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "문항이 시도에 속하지 않음" }, { status: 400 });

  await prisma.quizAnswer.upsert({
    where: { attemptId_quizItemId: { attemptId, quizItemId } },
    update: { response },
    create: { attemptId, quizItemId, response },
  });

  return NextResponse.json({ ok: true });
}