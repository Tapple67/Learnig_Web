import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import BlockShell from "./block_shell";

type Row = {
  id: string;
  type: "FILE_UPLOAD" | "NOTE_EDIT";
  gradeId: string;
  subjectId: string;
  subjectName: string;
  materialId: string;
  materialTitle: string;
  page: number | null;
  title: string;
  updatedAt: Date;
};

function hrefRecord(r: { gradeId: string; subjectId: string; materialId: string; page: number }) {
  const sp = new URLSearchParams({
    gradeId: r.gradeId,
    subjectId: r.subjectId,
    materialId: r.materialId,
    page: String(r.page),
  });
  return `/record?${sp.toString()}`;
}

function hrefQuiz(r: { gradeId: string; subjectId: string; quizSetId: string }) {
  const returnTo = `/subject?${new URLSearchParams({ gradeId: r.gradeId, subjectId: r.subjectId }).toString()}`;
  return `/quiz/take/${r.quizSetId}?mode=resume&returnTo=${encodeURIComponent(returnTo)}`;
}

export default async function RecentActivity() {
  const userId = await getUserId();
  if (!userId) return null;

  const rows: Row[] = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      gradeId: true,
      subjectId: true,
      subjectName: true,
      materialId: true,
      materialTitle: true,
      page: true,
      title: true,
      updatedAt: true,
    },
  });

  const finalRows = rows.slice(0, 5).map((row) => {
    const isQuizActivity = row.type === "FILE_UPLOAD" && row.page === 0;

    if (isQuizActivity) {
      return {
        key: row.id,
        title: row.title,
        href: hrefQuiz({ gradeId: row.gradeId, subjectId: row.subjectId, quizSetId: row.materialId }),
        updatedAt: row.updatedAt,
      };
    }

    const page = row.page && row.page > 0 ? row.page : 1;
    return {
      key: row.id,
      title: row.title,
      href: hrefRecord({
        gradeId: row.gradeId,
        subjectId: row.subjectId,
        materialId: row.materialId,
        page,
      }),
      updatedAt: row.updatedAt,
    };
  });

  return (
    <BlockShell
      title="활동 로그"
      className="h-full rounded-3xl border-slate-200 bg-white p-6 shadow-md shadow-slate-200/70"
      bodyClassName="space-y-3"
    >
      {finalRows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          ㅁㅁ
        </p>
      ) : (
        <ul className="space-y-2">
          {finalRows.map((activity) => (
            <li
              key={activity.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sky-200 hover:bg-sky-50"
            >
              <Link href={activity.href} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-sky-700">
                {activity.title}
              </Link>
              <span className="shrink-0 text-xs text-slate-500">
                {new Date(activity.updatedAt).toLocaleDateString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  );
}
