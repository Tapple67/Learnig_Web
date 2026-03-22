import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Combi from "./combi";

export default async function SubjectPage({
  searchParams,
}: {
  searchParams: Promise<{ gradeId?: string; subjectId?: string }>;
}) {
  const params = await searchParams;

  const userId = await getUserId();
  if (!userId) {
    return <div>로그인이 필요합니다.</div>;
  }

  const grades = await prisma.grade.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, year: true, term: true },
  });

  const selectedGradeId = params.gradeId ?? grades[0]?.id;
  const selectedSubjectId = params.subjectId;

  const subjects = selectedGradeId
    ? await prisma.subject.findMany({
        where: {
          gradeId: selectedGradeId,
          grade: { userId },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, gradeId: true },
      })
    : [];

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
        select: { id: true, week: true, title: true },
      })
    : [];

  return (
    <Combi
      grades={grades}
      subjects={subjects}
      materials={materials}
      selectedGradeId={selectedGradeId}
      selectedSubjectId={selectedSubjectId}
    />
  );
}
