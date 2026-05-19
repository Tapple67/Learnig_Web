export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gradeId = String(searchParams.get("gradeId") ?? "").trim();
  if (!gradeId) {
    return NextResponse.json({ error: "학기 선택이 필요합니다." }, { status: 400 });
  }

  const subjects = await prisma.subject.findMany({
    where: { gradeId, grade: { userId } },
    orderBy: { createdAt: "desc" },
    include: {
      materials: {
        orderBy: [{ week: "asc" }, { createdAt: "asc" }],
        select: { id: true, week: true, title: true, storagePath: true },
      },
    },
  });

  return NextResponse.json(subjects);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const gradeId = String(body?.gradeId ?? "").trim();

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "과목명은 1~50자여야 합니다." }, { status: 400 });
  }
  if (!gradeId) {
    return NextResponse.json({ error: "학기 정보가 필요합니다." }, { status: 400 });
  }

  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, userId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "유효하지 않은 학기입니다." }, { status: 403 });
  }

  const subject = await prisma.subject.create({
    data: { gradeId: grade.id, name },
    select: { id: true, name: true, gradeId: true },
  });

  return NextResponse.json({ ok: true, subject }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subjectId = String(body?.subjectId ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!subjectId) return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });
  if (!name || name.length > 50) {
    return NextResponse.json({ error: "과목명은 1~50자여야 합니다." }, { status: 400 });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없거나 과목이 없습니다." }, { status: 403 });

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data: { name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ ok: true, subject: updated });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subjectId = String(body?.subjectId ?? "").trim();
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) {
    return NextResponse.json({ error: "권한이 없거나 과목이 없습니다." }, { status: 403 });
  }

  await prisma.subject.delete({ where: { id: subjectId } });
  return NextResponse.json({ ok: true });
}
