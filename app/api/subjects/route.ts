export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET(req: Request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "권한이 없습니다. 로그인해주세요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gradeId = searchParams.get("gradeId");

  if (!gradeId) {
    return NextResponse.json({ error: "학기 선택이 필요합니다." }, { status: 400 });
  }

  const subjects = await prisma.subject.findMany({
    where: {
      gradeId,
      grade: {
        userId,
      },
    },
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
    return NextResponse.json({ error: "권한이 없습니다. 로그인해주세요." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const gradeId = String(body?.gradeId ?? "").trim();

  if (name.length < 1 || name.length > 50) {
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
    data: {
      gradeId: grade.id,
      name,
    },
  });

  revalidatePath("/subjects");
  return NextResponse.json({ subject }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { subjectId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const subjectId = params.subjectId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.subject.delete({ where: { id: subjectId } });
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DB 삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
