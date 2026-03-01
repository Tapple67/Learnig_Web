import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { gradeAttempt } from "@/services/grading";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const attemptId = String(body?.attemptId ?? "");
  if (!attemptId) return NextResponse.json({ error: "attemptId 필요" }, { status: 400 });

  try {
    const result = await gradeAttempt({ attemptId, userId });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "제출/채점 실패" }, { status: 400 });
  }
}