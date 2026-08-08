import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMaterialPacket, computeMaterialSourceHash } from "@/app/(main)/quiz/utils/material_packet";
import Combi from "./components/Combi";

type SearchParams = {
  gradeId?: string;
  subjectId?: string;
  materialId?: string;
};

type AttemptCard = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
};

function pickLatestAttempt(attempts: AttemptCard[]) {
  const submitted = attempts.find((a) => a.status === "GRADED" || a.status === "SUBMITTED");
  const picked = submitted ?? attempts[0] ?? null;
  if (!picked) return null;
  return {
    id: picked.id,
    status: picked.status,
    score: picked.score,
    maxScore: picked.maxScore,
  };
}

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
            select: { id: true, status: true, score: true, maxScore: true, startedAt: true },
          },
        },
      })
    : [];

  const selectedSummary = selectedMaterialId
    ? await prisma.materialSummary.findUnique({
        where: { materialId: selectedMaterialId },
        select: {
          id: true,
          sourceHash: true,
          content: true,
          canonical: true,
          updatedAt: true,
          material: { select: { week: true, title: true } },
        },
      })
    : null;

  const currentSummarySourceHash = selectedMaterialId && selectedSummary
    ? computeMaterialSourceHash(await buildMaterialPacket(selectedMaterialId))
    : null;

  return (
    <Combi
      grades={grades}
      subjects={subjects}
      materials={materials}
      selectedGradeId={selectedGradeId}
      selectedSubjectId={selectedSubjectId}
      selectedMaterialId={selectedMaterialId}
      summary={
        selectedSummary
          ? {
              id: selectedSummary.id,
              title: `${selectedSummary.material.week}주차 요약: ${selectedSummary.material.title}`,
              content: selectedSummary.canonical ?? selectedSummary.content,
              isStale: selectedSummary.sourceHash !== currentSummarySourceHash,
              updatedAt: selectedSummary.updatedAt.toISOString(),
            }
          : null
      }
      quizSets={quizSets.map((q) => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt.toISOString(),
        itemCount: q.items.length,
        latestAttempt: pickLatestAttempt(q.attempts),
      }))}
    />
  );
}
