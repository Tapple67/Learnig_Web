import { prisma } from "@/lib/db";

export async function assertMaterialOwnedByUser(params: { userId: string; materialId: string }) {
  const ok = await prisma.material.findFirst({
    where: { id: params.materialId, subject: { grade: { userId: params.userId } } },
    select: { id: true },
  });
  if (!ok) throw new Error("권한 없음(자료)");
}

export async function assertQuizSetOwnedByUser(params: { userId: string; quizSetId: string }) {
  const ok = await prisma.quizSet.findFirst({
    where: { id: params.quizSetId, material: { subject: { grade: { userId: params.userId } } } },
    select: { id: true },
  });
  if (!ok) throw new Error("권한 없음(퀴즈)");
}