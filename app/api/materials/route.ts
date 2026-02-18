export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });
  }

  // 소유 검증: subject가 내 grade(userId)에 속하는지
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const materials = await prisma.material.findMany({
    where: { subjectId },
    orderBy: [{ week: "asc" }, { createdAt: "asc" }],
    select: { id: true, week: true, title: true, fileUrl: true },
  });

  return NextResponse.json(materials);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const form = await req.formData();

  const subjectId = String(form.get("subjectId") ?? "").trim();
  const week = Number(form.get("week") ?? 0);
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");

  if (!subjectId) return NextResponse.json({ error: "subjectId가 필요합니다." }, { status: 400 });
  if (!week || week < 1) return NextResponse.json({ error: "week가 올바르지 않습니다." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title이 필요합니다." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file이 필요합니다." }, { status: 400 });

  // 소유 검증
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, grade: { userId } },
    select: { id: true },
  });
  if (!subject) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  // 파일 저장
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const safeName = file.name.replaceAll(" ", "_");
  const fileName = `${Date.now()}_${safeName}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, buffer);

  const fileUrl = `/uploads/${fileName}`;

  // DB 등록
  const material = await prisma.material.create({
    data: {
      subjectId,
      week,
      title,
      fileUrl,
    },
    select: { id: true, week: true, title: true, fileUrl: true },
  });

  return NextResponse.json({ material }, { status: 201 });
}