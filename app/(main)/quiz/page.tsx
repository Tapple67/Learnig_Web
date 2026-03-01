// app/quiz/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import QuizShell from "./quizs_shell";

export const runtime = "nodejs";

type SearchParams = {
  gradeId?: string;
  subjectId?: string;
  materialId?: string;
};

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const sp = await searchParams;
  const gradeId = sp.gradeId;
  const subjectId = sp.subjectId;
  const materialId = sp.materialId;

  const grades = await prisma.grade.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, year: true, term: true, isCurrent: true },
  });

  const effectiveGradeId =
    gradeId ?? grades.find((g) => g.isCurrent)?.id ?? grades[0]?.id ?? undefined;

  const subjects = effectiveGradeId
    ? await prisma.subject.findMany({
        where: { gradeId: effectiveGradeId },
        orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
        select: { id: true, name: true, isCurrent: true, gradeId: true },
      })
    : [];

  const effectiveSubjectId =
    subjectId ?? subjects.find((s) => s.isCurrent)?.id ?? subjects[0]?.id ?? undefined;

  const materials = effectiveSubjectId
    ? await prisma.material.findMany({
        where: { subjectId: effectiveSubjectId },
        orderBy: [{ week: "asc" }, { createdAt: "asc" }],
        select: { id: true, week: true, title: true, createdAt: true, subjectId: true },
      })
    : [];

  const effectiveMaterialId = materialId ?? materials[0]?.id ?? undefined;

  // ✅ 퀴즈 목록 + 내 최신 attempt 1개
  const quizSets = effectiveMaterialId
    ? await prisma.quizSet.findMany({
        where: { materialId: effectiveMaterialId },
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
      })
    : [];

  const context = {
    grade: grades.find((g) => g.id === effectiveGradeId) ?? null,
    subject: subjects.find((s) => s.id === effectiveSubjectId) ?? null,
    material: materials.find((m) => m.id === effectiveMaterialId) ?? null,
  };

  return (
    <QuizShell
      grades={grades}
      subjects={subjects}
      materials={materials}
      quizSets={quizSets.map((q) => ({
        id: q.id,
        title: q.title ?? null,
        createdAt: q.createdAt.toISOString(),
        itemCount: q.items.length,
        latestAttempt: q.attempts[0]
          ? {
              id: q.attempts[0].id,
              status: q.attempts[0].status,
              score: q.attempts[0].score,
              maxScore: q.attempts[0].maxScore,
              startedAt: q.attempts[0].startedAt.toISOString(),
              submittedAt: q.attempts[0].submittedAt?.toISOString() ?? null,
            }
          : null,
      }))}
      selected={{
        gradeId: effectiveGradeId,
        subjectId: effectiveSubjectId,
        materialId: effectiveMaterialId,
      }}
      context={context}
    />
  );
}