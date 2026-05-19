import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { assertMaterialOwnedByUser } from "@/lib/authz";
import { ensureMaterialSummary } from "@/app/(main)/quiz/hooks/summaryService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const materialId = String(body?.materialId ?? "").trim();
  if (!materialId) return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });

  try {
    await assertMaterialOwnedByUser({ userId, materialId });
    const result = await ensureMaterialSummary(materialId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "요약 생성 실패" }, { status: 400 });
  }
}
