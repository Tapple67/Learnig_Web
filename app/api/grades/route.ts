export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const grades = await prisma.grade.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { term: "asc" }],
  });

  return NextResponse.json(grades);
}

export async function PATCH(req: Request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const gradeId = typeof body?.gradeId === "string" ? body.gradeId : "";

  if (!gradeId) {
    return NextResponse.json({ error: "gradeId가 필요합니다." }, { status: 400 });
  }

  const target = await prisma.grade.findFirst({
    where: { id: gradeId, userId },
    select: { id: true, isCurrent: true },
  });

  if (!target) {
    return NextResponse.json({ error: "해당 학기를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.isCurrent) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await prisma.$transaction([
    prisma.grade.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.grade.update({
      where: { id: gradeId },
      data: { isCurrent: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
