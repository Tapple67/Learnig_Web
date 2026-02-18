import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = String(searchParams.get("materialId") ?? "");
  const pageParam = searchParams.get("page");

  if (!materialId) {
    return NextResponse.json({ error: "materialId가 필요합니다" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return NextResponse.json({ error: "자료가 없습니다" }, { status: 404 });

  // 내 자료인지 확인(보안)
  const subject = await prisma.subject.findFirst({
    where: { id: material.subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  // 특정 페이지 1개 조회
  if (pageParam != null) {
    const page = Number(pageParam);
    const note = await prisma.pageNote.findUnique({
      where: { materialId_page: { materialId, page } },
    });
    return NextResponse.json({ note });
  }

  // 전체 페이지 노트 조회
  const notes = await prisma.pageNote.findMany({
    where: { materialId },
    orderBy: { page: "asc" },
  });

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });

  const { materialId, page, content } = await req.json();

  if (!materialId || !Number.isFinite(Number(page))) {
    return NextResponse.json({ error: "materialId/page가 필요합니다" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return NextResponse.json({ error: "자료가 없습니다" }, { status: 404 });

  // 내 자료인지 확인(보안)
  const subject = await prisma.subject.findFirst({
    where: { id: material.subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const note = await prisma.pageNote.upsert({
    where: { materialId_page: { materialId, page: Number(page) } },
    update: { content: String(content ?? "") },
    create: { materialId, page: Number(page), content: String(content ?? "") },
  });

  return NextResponse.json({ note });
}