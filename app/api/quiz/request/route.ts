import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { assertMaterialOwnedByUser } from "@/lib/authz";
import { generateAndSaveQuiz } from "@/services/quizContentService";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const materialId = String(body?.materialId ?? "");
  if (!materialId) return NextResponse.json({ error: "materialId 필요" }, { status: 400 });

  try {
    await assertMaterialOwnedByUser({ userId, materialId });

    const spec = body?.spec ?? undefined; // {mcqCount, tfCount, shortCount}
    const result = await generateAndSaveQuiz({ materialId, spec });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "퀴즈 생성 실패" }, { status: 400 });
  }
}


export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const materialId = String(searchParams.get("materialId") ?? "");
  if (!materialId) return NextResponse.json({ error: "materialId 필요" }, { status: 400 });

  try {
    // ✅ 소유권 체크(중요)
    // 이미 authz 유틸을 쓰는 스타일이니까 material용도 하나 만들어두는 걸 추천.
    // 없으면 아래 대체 쿼리(주석)로 체크 가능
    await assertMaterialOwnedByUser({ userId, materialId });

    const quizSets = await prisma.quizSet.findMany({
      where: { materialId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        createdAt: true,
        items: { select: { id: true } }, // itemCount
        attempts: {
          where: { userId },
          orderBy: [{ startedAt: "desc" }],
          take: 1,
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            submittedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      quizSets: quizSets.map((q) => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt,
        itemCount: q.items.length,
        latestAttempt: q.attempts[0] ?? null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "목록 조회 실패" }, { status: 403 });
  }
}

/**
 * ✅ assertMaterialOwnedByUser가 아직 없다면 대체 체크:
 *
 * const ok = await prisma.material.findFirst({
 *   where: { id: materialId, subject: { grade: { userId } } },
 *   select: { id: true },
 * });
 * if (!ok) throw new Error("권한 없음(파일)");
 */