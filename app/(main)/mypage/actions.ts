"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

function toPositiveNumber(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

export async function updateGoalAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) throw new Error("로그인이 필요합니다.");

  const dailyQuizGoal = toPositiveNumber(formData.get("dailyQuizGoal"), 10);
  const weeklyQuizGoal = toPositiveNumber(formData.get("weeklyQuizGoal"), 70);
  const dailyMaterialGoal = toPositiveNumber(formData.get("dailyMaterialGoal"), 3);
  const weeklyMaterialGoal = toPositiveNumber(formData.get("weeklyMaterialGoal"), 15);

  await prisma.goal.upsert({
    where: { userId },
    update: {
      dailyQuizGoal,
      weeklyQuizGoal,
      dailyMaterialGoal,
      weeklyMaterialGoal,
    },
    create: {
      userId,
      dailyQuizGoal,
      weeklyQuizGoal,
      dailyMaterialGoal,
      weeklyMaterialGoal,
    },
  });

  revalidatePath("/mypage");
}
