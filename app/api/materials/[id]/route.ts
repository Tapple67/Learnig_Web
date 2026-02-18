export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });

  const material = await prisma.material.findUnique({
    where: { id: params.id },
  });

  if (!material) {
    return NextResponse.json({ error: "자료가 없습니다" }, { status: 404 });
  }

  // 내 과목인지 확인
  const subject = await prisma.subject.findFirst({
    where: { id: material.subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  return NextResponse.json({ material });
}

// ✅ 이름 바꾸기 (title 변경)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();

  if (title.length < 1 || title.length > 80) {
    return NextResponse.json({ error: "이름은 1~80자여야 합니다." }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: params.id } });
  if (!material) return NextResponse.json({ error: "자료가 없습니다" }, { status: 404 });

  // 내 과목인지 확인
  const subject = await prisma.subject.findFirst({
    where: { id: material.subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const updated = await prisma.material.update({
    where: { id: params.id },
    data: { title },
  });

  return NextResponse.json({ material: updated });
}