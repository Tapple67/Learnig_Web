// lib/stats/materialStats.ts

import { prisma } from "@/lib/db";
import type { MaterialStatsResponse, QuizType, TopicStat } from "../types";
import {
  buildRecommendations,
  getEmptyPurposeStats,
  getEmptyTypeStats,
  getUnderstandingLevel,
  normalizeQuizPurpose,
  round1,
  toPercent,
} from "../utils/stats_utils";

export async function getMaterialStats(params: {
  userId: string;
  materialId: string;
}): Promise<MaterialStatsResponse> {
  const { userId, materialId } = params;

  const material = await prisma.material.findFirst({
    where: {
      id: materialId,
      subject: {
        grade: {
          userId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      week: true,
      createdAt: true,
      subject: {
        select: {
          id: true,
          name: true,
          grade: {
            select: {
              id: true,
              year: true,
              term: true,
            },
          },
        },
      },
    },
  });

  if (!material) {
    throw new Error("권한 없음(파일)");
  }

  const quizSets = await prisma.quizSet.findMany({
    where: {
      materialId,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      createdAt: true,
      items: {
        orderBy: [{ order: "asc" }],
        select: {
          id: true,
          order: true,
          type: true,
          topic: true,
          points: true,
        },
      },
      attempts: {
        where: {
          userId,
          status: {
            in: ["SUBMITTED", "GRADED"],
          },
        },
        orderBy: [{ startedAt: "asc" }],
        select: {
          id: true,
          status: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
          answers: {
            select: {
              quizItemId: true,
              isCorrect: true,
              earned: true,
            },
          },
        },
      },
    },
  });

  if (quizSets.length === 0 || quizSets.every((q) => q.attempts.length === 0)) {
    return {
      material: {
        id: material.id,
        title: material.title,
        week: material.week,
        subjectName: material.subject.name,
        grade: {
          year: material.subject.grade.year,
          term: material.subject.grade.term,
        },
      },
      summary: {
        totalAttempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalWrong: 0,
        accuracy: 0,
        averageScore: 0,
        bestScore: 0,
        latestScore: 0,
      },
      understanding: {
        level: "NONE",
        label: "통계 없음",
        message: "아직 제출된 퀴즈 결과가 없습니다.",
      },
      typeStats: getEmptyTypeStats(),
      purposeStats: getEmptyPurposeStats(),
      trend: [],
      weakTopics: [],
      recommendations: ["먼저 이 파일에 대해 퀴즈를 풀어보세요."],
    };
  }

  let totalAttempts = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalWrong = 0;

  const scoreList: number[] = [];
  const trend: MaterialStatsResponse["trend"] = [];
  const typeStats = getEmptyTypeStats();
  const purposeStats = getEmptyPurposeStats();

  const topicMap = new Map<string, { total: number; correct: number; wrong: number }>();
  const purposeRows = await prisma.$queryRaw<Array<{ id: string; purpose: string }>>`
    SELECT "id", "purpose" FROM "QuizSet" WHERE "materialId" = ${materialId}
  `;
  const purposeMap = new Map(purposeRows.map((row) => [row.id, row.purpose]));

  for (const quizSet of quizSets) {
    const purpose = normalizeQuizPurpose(purposeMap.get(quizSet.id));
    const itemMap = new Map(
      quizSet.items.map((item) => [
        item.id,
        {
          type: item.type,
          topic: item.topic?.trim() || "기타 개념",
        },
      ])
    );

    for (const attempt of quizSet.attempts) {
      totalAttempts += 1;
      purposeStats[purpose].attempts += 1;

      const score = attempt.score ?? 0;
      const maxScore = attempt.maxScore ?? 0;
      scoreList.push(score);

      trend.push({
        attemptId: attempt.id,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        score,
        maxScore,
        accuracy: maxScore > 0 ? toPercent(score, maxScore) : 0,
        purpose,
      });

      for (const answer of attempt.answers) {
        const item = itemMap.get(answer.quizItemId);
        if (!item) continue;
        if (item.type !== "mcq" && item.type !== "tf" && item.type !== "short") continue;
        const quizType: QuizType = item.type;

        totalQuestions += 1;

        const isCorrect = answer.isCorrect === true;
        if (isCorrect) totalCorrect += 1;
        else totalWrong += 1;

        purposeStats[purpose].total += 1;
        if (isCorrect) purposeStats[purpose].correct += 1;
        else purposeStats[purpose].wrong += 1;

        typeStats[quizType].total += 1;
        if (isCorrect) typeStats[quizType].correct += 1;
        else typeStats[quizType].wrong += 1;

        const prev = topicMap.get(item.topic) ?? { total: 0, correct: 0, wrong: 0 };
        prev.total += 1;
        if (isCorrect) prev.correct += 1;
        else prev.wrong += 1;
        topicMap.set(item.topic, prev);
      }
    }
  }

  for (const key of Object.keys(typeStats) as QuizType[]) {
    const s = typeStats[key];
    s.accuracy = toPercent(s.correct, s.total);
  }

  for (const key of Object.keys(purposeStats) as Array<keyof typeof purposeStats>) {
    const s = purposeStats[key];
    s.accuracy = toPercent(s.correct, s.total);
  }

  const overallAccuracy = toPercent(totalCorrect, totalQuestions);
  const averageScore =
    scoreList.length > 0 ? round1(scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : 0;
  const bestScore = scoreList.length > 0 ? Math.max(...scoreList) : 0;
  const latestTrend = trend[trend.length - 1];
  const latestScore = latestTrend?.score ?? 0;

  const understanding = getUnderstandingLevel(overallAccuracy);

  const topicStats: TopicStat[] = Array.from(topicMap.entries()).map(([topic, stat]) => ({
    topic,
    total: stat.total,
    correct: stat.correct,
    wrong: stat.wrong,
    accuracy: toPercent(stat.correct, stat.total),
  }));

  const weakTopics = topicStats
    .filter((t) => t.total >= 2 && (t.accuracy < 60 || t.wrong >= 2))
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.wrong - a.wrong;
    })
    .slice(0, 5);

  const recommendations = buildRecommendations({
    overallAccuracy,
    typeStats,
    weakTopics,
  });

  return {
    material: {
      id: material.id,
      title: material.title,
      week: material.week,
      subjectName: material.subject.name,
      grade: {
        year: material.subject.grade.year,
        term: material.subject.grade.term,
      },
    },
    summary: {
      totalAttempts,
      totalQuestions,
      totalCorrect,
      totalWrong,
      accuracy: overallAccuracy,
      averageScore,
      bestScore,
      latestScore,
    },
    understanding,
    typeStats,
    purposeStats,
    trend,
    weakTopics,
    recommendations,
  };
}
