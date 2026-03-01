import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { supabaseService } from "@/lib/storage";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId") ?? "";
    if (!materialId) return NextResponse.json({ error: "materialId 필요" }, { status: 400 });

    // ✅ 소유권 체크: Material -> Subject -> Grade(userId)
    const material = await prisma.material.findFirst({
      where: { id: materialId, subject: { grade: { userId } } },
      select: { storagePath: true },
    });
    if (!material) return NextResponse.json({ error: "권한 없음(자료)" }, { status: 403 });

    const supabase = supabaseService();
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.storagePath, 60 * 10); // 10분

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? "Signed URL 실패" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "오류" }, { status: 500 });
  }
}