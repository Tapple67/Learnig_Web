import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Combi from "./components/Combi";

type SearchParams = {
  gradeId?: string;
  subjectId?: string;
  materialId?: string;
};

export default async function SubjectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const userId = await getUserId();
  if (!userId) redirect("/login");

  const grades = await prisma.grade.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { term: "asc" }],
    select: { id: true, year: true, term: true },
  });

  const selectedGradeId = params.gradeId ?? grades[0]?.id;

  const subjects = selectedGradeId
    ? await prisma.subject.findMany({
        where: { gradeId: selectedGradeId, grade: { userId } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, gradeId: true, createdAt: true },
      })
    : [];

  const selectedSubjectId = params.subjectId ?? subjects[0]?.id;

  const materials = selectedSubjectId
    ? await prisma.material.findMany({
        where: {
          subjectId: selectedSubjectId,
          subject: {
            gradeId: selectedGradeId,
            grade: { userId },
          },
        },
        orderBy: [{ week: "asc" }, { createdAt: "asc" }],
        select: { id: true, week: true, title: true, createdAt: true },
      })
    : [];

  const selectedMaterialId = params.materialId ?? materials[0]?.id;

  const selectedMaterial = selectedMaterialId
    ? await prisma.material.findFirst({
        where: { id: selectedMaterialId, subject: { grade: { userId } } },
        select: {
          id: true,
          title: true,
          week: true,
          summary: {
            select: {
              id: true,
              updatedAt: true,
              provider: true,
              model: true,
            },
          },
        },
      })
    : null;

  const quizSets = selectedMaterialId
    ? await prisma.quizSet.findMany({
        where: { materialId: selectedMaterialId },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          createdAt: true,
          items: { select: { id: true } },
          attempts: {
            where: { userId },
            orderBy: [{ startedAt: "desc" }],
            take: 1,
            select: { id: true, status: true, score: true, maxScore: true },
          },
        },
      })
    : [];

  return (
    <Combi
      grades={grades}
      subjects={subjects}
      materials={materials}
      selectedGradeId={selectedGradeId}
      selectedSubjectId={selectedSubjectId}
      selectedMaterialId={selectedMaterialId}
      selectedMaterial={
        selectedMaterial
          ? {
              id: selectedMaterial.id,
              title: selectedMaterial.title,
              week: selectedMaterial.week,
              summary: selectedMaterial.summary
                ? {
                    id: selectedMaterial.summary.id,
                    updatedAt: selectedMaterial.summary.updatedAt.toISOString(),
                    provider: selectedMaterial.summary.provider,
                    model: selectedMaterial.summary.model,
                  }
                : null,
            }
          : null
      }
      quizSets={quizSets.map((q) => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt.toISOString(),
        itemCount: q.items.length,
        latestAttempt: q.attempts[0] ?? null,
      }))}
    />
  );
}
