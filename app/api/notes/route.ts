export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = String(searchParams.get("materialId") ?? "").trim();
  const page = Number(searchParams.get("page") ?? "1");

  if (!materialId) return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });
  if (!Number.isFinite(page) || page < 1) return NextResponse.json({ error: "page가 올바르지 않습니다." }, { status: 400 });

  const material = await prisma.material.findFirst({
    where: { id: materialId, subject: { grade: { userId } } },
    select: { id: true },
  });
  if (!material) return NextResponse.json({ error: "권한이 없거나 자료가 없습니다." }, { status: 403 });

  const note = await prisma.note.findUnique({
    where: { materialId_page: { materialId, page } },
    select: { id: true, content: true, page: true, updatedAt: true },
  });

  return NextResponse.json({ note });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);

  const materialId = String(body?.materialId ?? "").trim();
  const page = Number(body?.page ?? 1);
  const content = String(body?.content ?? "");

  if (!materialId) return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });
  if (!Number.isFinite(page) || page < 1) return NextResponse.json({ error: "page가 올바르지 않습니다." }, { status: 400 });

  const material = await prisma.material.findFirst({
    where: { id: materialId, subject: { grade: { userId } } },
    select: { id: true },
  });
  if (!material) return NextResponse.json({ error: "권한이 없거나 자료가 없습니다." }, { status: 403 });

  const note = await prisma.note.upsert({
    where: { materialId_page: { materialId, page } },
    update: { content },
    create: { materialId, page, content },
    select: { id: true, page: true, content: true },
  });

  return NextResponse.json({ ok: true, note });
}