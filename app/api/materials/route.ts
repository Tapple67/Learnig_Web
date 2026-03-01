export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { logFileUpload } from "@/lib/activity";
import { supabaseService } from "@/lib/storage";

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
    select: { id: true, week: true, title: true, storagePath: true },
  });

  return NextResponse.json(materials);
}

/**
 * 📌 PDF 업로드
 * POST /api/materials
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const form = await req.formData();
    const subjectId = String(form.get("subjectId") ?? "");
    const week = Number(form.get("week") ?? "0");
    const title = String(form.get("title") ?? "");
    const file = form.get("file");

    if (!subjectId) return NextResponse.json({ error: "subjectId 필요" }, { status: 400 });
    if (!week || week < 1) return NextResponse.json({ error: "week가 이상함" }, { status: 400 });
    if (!title.trim()) return NextResponse.json({ error: "title 필요" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "file 필요" }, { status: 400 });
    if (file.type !== "application/pdf")
      return NextResponse.json({ error: "PDF만 업로드 가능" }, { status: 400 });

    // ✅ 1) subject 소유권 체크 (Subject -> Grade -> User)
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, grade: { userId } },
      select: { id: true },
    });
    if (!subject) return NextResponse.json({ error: "권한 없음(과목)" }, { status: 403 });

    // ✅ 2) Material 먼저 생성 (id 확보)
    const material = await prisma.material.create({
      data: {
        subjectId,
        week,
        title: title.trim(),
        storagePath: "TEMP",
      },
      select: { id: true, subjectId: true, week: true, title: true },
    });

    // ✅ 3) Storage 업로드
    const supabase = supabaseService();
    const storagePath = `users/${userId}/materials/${material.id}.pdf`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      await prisma.material.delete({ where: { id: material.id } }).catch(() => {});
      return NextResponse.json(
        { error: `스토리지 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // ✅ 4) storagePath 업데이트
    const updated = await prisma.material.update({
      where: { id: material.id },
      data: { storagePath },
      select: { id: true, subjectId: true, week: true, title: true, storagePath: true },
    });

    // ✅ 5) EXTRACT_PDF Job 생성
    await prisma.job.create({
      data: {
        type: "EXTRACT_PDF",
        status: "PENDING",
        materialId: updated.id,
        payload: { bucket: "materials", path: storagePath },
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "업로드 실패" }, { status: 500 });
  }
}
