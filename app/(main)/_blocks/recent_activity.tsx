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

  // NOTE: 묶기 때문에 조금 넉넉히 가져옴
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

  // materialId 기준 NOTE_EDIT 묶기
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

  for (const r of rows) {
    if (r.type !== "NOTE_EDIT") {
      singles.push({
        key: r.id,
        title: r.title,
        href: hrefRecord({ gradeId: r.gradeId, subjectId: r.subjectId, materialId: r.materialId, page: r.page ?? 1 }),
        updatedAt: r.updatedAt,
      });
      continue;
    }

    const p = r.page ?? 1;
    const g = noteGroup.get(r.materialId);
    if (!g) {
      noteGroup.set(r.materialId, {
        gradeId: r.gradeId,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        materialId: r.materialId,
        materialTitle: r.materialTitle,
        updatedAt: r.updatedAt,
        latestPage: p,
        pages: new Set([p]),
      });
    } else {
      g.pages.add(p);
      if (r.updatedAt > g.updatedAt) {
        g.updatedAt = r.updatedAt;
        g.latestPage = p;
        g.subjectName = r.subjectName;
        g.materialTitle = r.materialTitle;
        g.gradeId = r.gradeId;
        g.subjectId = r.subjectId;
      }
    }
  }

  const grouped = Array.from(noteGroup.values()).map((g) => {
    const extra = g.pages.size - 1;
    const title =
      extra <= 0
        ? `${g.subjectName} - ${g.materialTitle} (p.${g.latestPage}) 노트 수정`
        : `${g.subjectName} - ${g.materialTitle} (p.${g.latestPage} 외 ${extra}페이지) 노트 수정`;

    return {
      key: `note:${g.materialId}`,
      title,
      href: hrefRecord({
        gradeId: g.gradeId,
        subjectId: g.subjectId,
        materialId: g.materialId,
        page: g.latestPage,
      }),
      updatedAt: g.updatedAt,
    };
  });

  const final = [...singles, ...grouped]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <BlockShell title="최근 활동">
      {final.length === 0 ? (
        <p className="text-sm text-gray-500">최근 활동이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {final.map((a) => (
            <li
              key={a.key}
              className="flex items-center justify-between gap-3 rounded-lg border p-2 hover:bg-gray-50"
            >
              <Link href={a.href} className="min-w-0 flex-1 truncate text-sm hover:underline">
                {a.title}
              </Link>
              <span className="shrink-0 text-xs text-gray-400">
                {new Date(a.updatedAt).toLocaleDateString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  );
}