import { prisma } from "@/lib/db";

const MAX_LOG_COUNT = 5;

async function enforceLogLimit(userId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (logs.length <= MAX_LOG_COUNT) return;

  const toDelete = logs.slice(MAX_LOG_COUNT);
  await prisma.activityLog.deleteMany({
    where: { id: { in: toDelete.map((l) => l.id) } },
  });
}

export async function logFileUpload(params: { userId: string; materialId: string }) {
  const { userId, materialId } = params;

  const material = await prisma.material.findFirst({
    where: { id: materialId, subject: { grade: { userId } } },
    select: {
      id: true,
      title: true,
      subject: { select: { id: true, name: true, gradeId: true } },
    },
  });
  if (!material) return;

  await prisma.activityLog.create({
    data: {
      userId,
      type: "FILE_UPLOAD",
      gradeId: material.subject.gradeId,
      subjectId: material.subject.id,
      subjectName: material.subject.name,        // ✅ 스냅샷
      materialId: material.id,
      materialTitle: material.title,             // ✅ 스냅샷
      page: 1,
      title: `${material.subject.name} - ${material.title} 업로드`,
    },
  });

  await enforceLogLimit(userId);
}

export async function logNoteEdit(params: {
  userId: string;
  materialId: string;
  page: number;
}) {
  const { userId, materialId, page } = params;

  const material = await prisma.material.findFirst({
    where: { id: materialId, subject: { grade: { userId } } },
    select: {
      id: true,
      title: true,
      subject: { select: { id: true, name: true, gradeId: true } },
    },
  });
  if (!material) return;

  const subjectName = material.subject.name;
  const materialTitle = material.title;

  await prisma.activityLog.upsert({
    where: {
      userId_materialId_page_type: { userId, materialId, page, type: "NOTE_EDIT" },
    },
    update: {
      // @updatedAt가 자동으로 갱신됨
      subjectName,
      materialTitle,
      title: `${subjectName} - ${materialTitle} (p.${page}) 노트 수정`,
    },
    create: {
      userId,
      type: "NOTE_EDIT",
      gradeId: material.subject.gradeId,
      subjectId: material.subject.id,
      subjectName,
      materialId: material.id,
      materialTitle,
      page,
      title: `${subjectName} - ${materialTitle} (p.${page}) 노트 수정`,
    },
  });

  await enforceLogLimit(userId);
}