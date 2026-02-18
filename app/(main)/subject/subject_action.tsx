"use server";

import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ActionState = { ok: boolean; error?: string } | null;

export async function SubjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getUserId();
  if (!userId) 
    return { ok: false, error: "권한이 없습니다. 로그인하세요." };

  const name = String(formData.get("name") ?? "").trim();
  const gradeId = String(formData.get("gradeId") ?? "").trim();

  if (!gradeId) return { ok: false, error: "학기를 먼저 선택해 주세요." };
  if (name.length < 1 || name.length > 50) {
    return { ok: false, error: "과목명은 1~50자여야 합니다." };
  }

  //  소유 검증(핵심 보안)
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, userId },
    select: { id: true },
  });
  if (!grade) return { ok: false, error: "유효하지 않은 학기입니다." };

  await prisma.subject.create({
    data: { gradeId: grade.id, name },
  });

  //  서버 렌더 결과 갱신
  revalidatePath("/subject");

  return { ok: true };
}
