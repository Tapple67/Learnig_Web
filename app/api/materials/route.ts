export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { logFileUpload } from "@/lib/activity";

/**
 * 📌 자료 목록 불러오기
 * GET /api/materials?subjectId=xxx
 */
export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = String(searchParams.get("subjectId") ?? "").trim();

  if (!subjectId)
    return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });

  // 소유권 체크
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });

  if (!subject)
    return NextResponse.json({ error: "권한이 없거나 과목이 없습니다." }, { status: 403 });

  const materials = await prisma.material.findMany({
    where: { subjectId },
    orderBy: [{ week: "asc" }, { createdAt: "asc" }],
    select: { id: true, week: true, title: true, fileUrl: true },
  });

  return NextResponse.json(materials);
}

/**
 * 📌 PDF 업로드
 * POST /api/materials
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "formData를 읽지 못했습니다." }, { status: 400 });

  const subjectId = String(form.get("subjectId") ?? "").trim();
  const week = Number(form.get("week") ?? "1");
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");

  if (!subjectId)
    return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });

  if (!Number.isFinite(week) || week < 1)
    return NextResponse.json({ error: "week가 올바르지 않습니다." }, { status: 400 });

  if (!title)
    return NextResponse.json({ error: "title이 필요합니다." }, { status: 400 });

  if (!(file instanceof File))
    return NextResponse.json({ error: "file이 필요합니다." }, { status: 400 });

  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "PDF만 업로드 가능합니다." }, { status: 400 });

  // 소유권 체크
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });

  if (!subject)
    return NextResponse.json({ error: "권한이 없거나 과목이 없습니다." }, { status: 403 });

  // 📁 public/uploads 폴더 생성
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = `${randomUUID()}.pdf`;
  const absPath = path.join(uploadDir, safeName);

  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(absPath, Buffer.from(arrayBuffer));

  // 🔥 중요: 절대경로 저장하면 안됨
  const fileUrl = `/uploads/${safeName}`;

  const material = await prisma.material.create({
    data: { subjectId, week, title, fileUrl },
    select: { id: true, week: true, title: true, fileUrl: true },
  });

  await logFileUpload({
    userId,
    materialId: material.id,
  });

  return NextResponse.json({ ok: true, material }, { status: 201 });
}