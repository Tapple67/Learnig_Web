// app/api/stats/material/route.ts
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getMaterialStats } from "@/lib/stats/materialstats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const materialId = String(searchParams.get("materialId") ?? "").trim();

  if (!materialId) {
    return NextResponse.json({ error: "materialId 필요" }, { status: 400 });
  }

  try {
    const stats = await getMaterialStats({ userId, materialId });
    return NextResponse.json(stats);
  } catch (e: any) {
    const message = e?.message ?? "통계 조회 실패";

    if (message.includes("권한 없음")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}