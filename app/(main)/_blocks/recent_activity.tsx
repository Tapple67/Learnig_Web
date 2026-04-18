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

export default async function RecentActivity() {
  const userId = await getUserId();
  if (!userId) return null;

  const rows: Row[] = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
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

  const noteGroup = new Map<
    string,
    {
      gradeId: string;
      subjectId: string;
      subjectName: string;
      materialId: string;
      materialTitle: string;
      updatedAt: Date;
      latestPage: number;
      pages: Set<number>;
    }
  >();

  const singles: Array<{
    key: string;
    title: string;
    href: string;
    updatedAt: Date;
  }> = [];

  for (const row of rows) {
    if (row.type !== "NOTE_EDIT") {
      singles.push({
        key: row.id,
        title: row.title,
        href: hrefRecord({
          gradeId: row.gradeId,
          subjectId: row.subjectId,
          materialId: row.materialId,
          page: row.page ?? 1,
        }),
        updatedAt: row.updatedAt,
      });
      continue;
    }

    const page = row.page ?? 1;
    const grouped = noteGroup.get(row.materialId);

    if (!grouped) {
      noteGroup.set(row.materialId, {
        gradeId: row.gradeId,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        materialId: row.materialId,
        materialTitle: row.materialTitle,
        updatedAt: row.updatedAt,
        latestPage: page,
        pages: new Set([page]),
      });
      continue;
    }

    grouped.pages.add(page);
    if (row.updatedAt > grouped.updatedAt) {
      grouped.updatedAt = row.updatedAt;
      grouped.latestPage = page;
      grouped.subjectName = row.subjectName;
      grouped.materialTitle = row.materialTitle;
      grouped.gradeId = row.gradeId;
      grouped.subjectId = row.subjectId;
    }
  }

  const groupedRows = Array.from(noteGroup.values()).map((item) => {
    const extraCount = item.pages.size - 1;
    const title =
      extraCount <= 0
        ? `${item.subjectName} - ${item.materialTitle} (p.${item.latestPage}) 노트 수정`
        : `${item.subjectName} - ${item.materialTitle} (p.${item.latestPage} 외 ${extraCount}페이지) 노트 수정`;

    return {
      key: `note:${item.materialId}`,
      title,
      href: hrefRecord({
        gradeId: item.gradeId,
        subjectId: item.subjectId,
        materialId: item.materialId,
        page: item.latestPage,
      }),
      updatedAt: item.updatedAt,
    };
  });

  const finalRows = [...singles, ...groupedRows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <BlockShell
      title="최근 활동"
      className="h-full rounded-3xl border-slate-200 bg-white p-6 shadow-md shadow-slate-200/70"
      bodyClassName="space-y-3"
    >
      {finalRows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          최근 활동이 없습니다.
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
