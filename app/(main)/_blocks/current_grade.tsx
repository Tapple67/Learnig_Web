// app/(home)/_blocks/CurrentSemesterBlock.tsx
import Link from "next/link";
import BlockShell from "./block_shell";
import { getUserId } from "@/lib/auth"; // 너 프로젝트에 맞게
import { prisma } from "@/lib/db";

export default async function Current_Grade() {
  const userId = await getUserId();
  if (!userId) return null;

  const grade = await prisma.grade.findFirst({
    where: { userId, isCurrent: true },
    select: {
      id: true,
      year: true,
      term: true,
      subjects: { select: { id: true, name: true }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <BlockShell
      title={grade ? `현재 학기: ${grade.year}년 ${grade.term ?? ""}학기` : "현재 학기 없음"}
      right={
        grade ? (
          <Link className="text-sm text-blue-600" href={`/subject?gradeId=${grade.id}`}>
            과목 관리 →
          </Link>
        ) : null
      }
    >
      {!grade ? (
        <p className="text-sm text-gray-500">현재 학기가 설정되어 있지 않습니다.</p>
      ) : grade.subjects.length === 0 ? (
        <p className="text-sm text-gray-500">과목이 없습니다. 과목을 추가해보세요.</p>
      ) : (
        <ul className="space-y-2">
          {grade.subjects.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <Link
                className="hover:underline"
                href={`/subject?gradeId=${grade.id}&subjectId=${s.id}`}
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  );
}