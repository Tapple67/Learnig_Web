import Link from "next/link";
import BlockShell from "./BlockShell";
import CurrentGradeModal from "./current_grade_modal";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Current_Grade() {
  const userId = await getUserId();
  if (!userId) return null;

  const [grade, grades] = await Promise.all([
    prisma.grade.findFirst({
      where: { userId, isCurrent: true },
      select: {
        id: true,
        year: true,
        term: true,
        subjects: {
          select: { id: true, name: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.grade.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { term: "asc" }],
      select: {
        id: true,
        year: true,
        term: true,
        isCurrent: true,
      },
    }),
  ]);

  return (
    <BlockShell
      title={grade ? `현재 학기: ${grade.year}년 ${grade.term ?? ""}학기` : "현재 학기 없음"}
      className="h-full min-h-[420px] rounded-3xl border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60"
      titleClassName="text-xl"
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CurrentGradeModal grades={grades} currentGradeId={grade?.id ?? null} />
          {grade ? (
            <Link
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
              href={`/subject?gradeId=${grade.id}`}
            >
              과목 관리
            </Link>
          ) : null}
        </div>
      }
    >
      {!grade ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          현재 학기가 아직 설정되지 않았습니다.
        </p>
      ) : grade.subjects.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          등록된 과목이 없습니다. 과목을 추가해 보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {grade.subjects.map((subject) => (
            <li
              key={subject.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50/60"
            >
              <Link
                className="block truncate text-sm font-medium text-slate-700 hover:text-sky-700"
                href={`/subject?gradeId=${grade.id}&subjectId=${subject.id}`}
              >
                {subject.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  );
}
