export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const id = params.id;
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const week = body?.week !== undefined ? Number(body.week) : undefined;

  if (!title && week === undefined) {
    return NextResponse.json({ error: "수정할 값이 없습니다." }, { status: 400 });
  }
  if (week !== undefined && (!Number.isFinite(week) || week < 1)) {
    return NextResponse.json({ error: "week가 올바르지 않습니다." }, { status: 400 });
  }

  const material = await prisma.material.findFirst({
    where: { id, subject: { grade: { userId } } },
    select: { id: true },
  });
  if (!material) return NextResponse.json({ error: "권한이 없거나 자료가 없습니다." }, { status: 403 });

  const updated = await prisma.material.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(week !== undefined ? { week } : {}),
    },
    select: { id: true, week: true, title: true, storagePath: true },
  });

  return NextResponse.json({ ok: true, material: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const id = params.id;

  const material = await prisma.material.findFirst({
    where: { id, subject: { grade: { userId } } },
    select: { id: true, storagePath: true },
  });
  if (!material) return NextResponse.json({ error: "권한이 없거나 자료가 없습니다." }, { status: 403 });

  // DB 삭제(노트는 cascade)
  await prisma.material.delete({ where: { id } });

  // 파일 삭제(가능하면)
  try {
    const abs = path.join(process.cwd(), "public", material.storagePath);
    await fs.unlink(abs);
  } catch {}

  return NextResponse.json({ ok: true });
}