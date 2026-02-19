"use server";

import {prisma} from "@/lib/db";
import { getUserId } from "@/lib/auth";

type ActionState = { ok: boolean; error?: string } | null;

export async function DeleteSubjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 필요합니다." };

  const subjectId = String(formData.get("subjectId") ?? "").trim();
  if (!subjectId) return { ok: false, error: "삭제할 과목을 선택하세요." };

  try {
    // 내 과목인지 확인
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, grade: {userId} },
      select: { id: true },
    });

    if (!subject) return { ok: false, error: "과목이 없거나 권한이 없습니다." };

    await prisma.$transaction(async (tx) => {
      await tx.subject.delete({ where: { id: subjectId } });
    });

    return { ok: true };
  } catch (e) {
    console.error("SubjectDeleteAction error:", e);
    return { ok: false, error: "삭제 중 오류가 발생했습니다." };
  }
}
