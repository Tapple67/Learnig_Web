export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { logRecordActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인하세요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const materialId = String(body?.materialId ?? "").trim();
  if (!materialId) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  await logRecordActivity({ userId, materialId });
  return NextResponse.json({ ok: true });
}
