import { prisma } from "@/lib/db";

const MAX_LOG_COUNT = 20;

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

  await prisma.activityLog.upsert({
    where: {
      userId_materialId_page_type: { userId, materialId: material.id, page: 1, type: "FILE_UPLOAD" },
    },
    update: {
      subjectName: material.subject.name,
      materialTitle: material.title,
      title: `${material.subject.name} - ${material.title} 파일 업로드`,
    },
    create: {
      userId,
      type: "FILE_UPLOAD",
      gradeId: material.subject.gradeId,
      subjectId: material.subject.id,
      subjectName: material.subject.name,
      materialId: material.id,
      materialTitle: material.title,
      page: 1,
      title: `${material.subject.name} - ${material.title} 파일 업로드`,
    },
  });

  await enforceLogLimit(userId);
}

export async function logRecordActivity(params: {
  userId: string;
  materialId: string;
}) {
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

  await prisma.activityLog.upsert({
    where: {
      userId_materialId_page_type: { userId, materialId: material.id, page: 0, type: "NOTE_EDIT" },
    },
    update: {
      subjectName: material.subject.name,
      materialTitle: material.title,
      title: `${material.subject.name} - ${material.title} 기록 이어보기`,
    },
    create: {
      userId,
      type: "NOTE_EDIT",
      gradeId: material.subject.gradeId,
      subjectId: material.subject.id,
      subjectName: material.subject.name,
      materialId: material.id,
      materialTitle: material.title,
      page: 0,
      title: `${material.subject.name} - ${material.title} 기록 이어보기`,
    },
  });

  await enforceLogLimit(userId);
}

export async function logQuizActivity(params: {
  userId: string;
  quizSetId: string;
}) {
  const { userId, quizSetId } = params;

  const quizSet = await prisma.quizSet.findFirst({
    where: { id: quizSetId, material: { subject: { grade: { userId } } } },
    select: {
      id: true,
      title: true,
      material: {
        select: {
          id: true,
          title: true,
          subject: { select: { id: true, name: true, gradeId: true } },
        },
      },
    },
  });
  if (!quizSet) return;

  const quizTitle = quizSet.title?.trim() || `${quizSet.material.title} 퀴즈`;

  // page=0 FILE_UPLOAD 조합을 "퀴즈 활동" 전용 키로 사용
  await prisma.activityLog.upsert({
    where: {
      userId_materialId_page_type: { userId, materialId: quizSet.id, page: 0, type: "FILE_UPLOAD" },
    },
    update: {
      gradeId: quizSet.material.subject.gradeId,
      subjectId: quizSet.material.subject.id,
      subjectName: quizSet.material.subject.name,
      materialTitle: quizTitle,
      title: `${quizSet.material.subject.name} - ${quizTitle} 이어풀기`,
    },
    create: {
      userId,
      type: "FILE_UPLOAD",
      gradeId: quizSet.material.subject.gradeId,
      subjectId: quizSet.material.subject.id,
      subjectName: quizSet.material.subject.name,
      materialId: quizSet.id,
      materialTitle: quizTitle,
      page: 0,
      title: `${quizSet.material.subject.name} - ${quizTitle} 이어풀기`,
    },
  });

  await enforceLogLimit(userId);
}