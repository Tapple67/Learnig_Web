// lib/stats/types.ts

export type QuizType = "mcq" | "tf" | "short";

export type TypeStat = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

export type TopicStat = {
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

export type QuizPurpose = "GENERAL" | "WRONG_REVIEW" | "WEAK_TOPIC";

export type PurposeStat = {
  attempts: number;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

export type UnderstandingResult = {
  level: "NONE" | "HIGH" | "MID_HIGH" | "MID_LOW" | "LOW";
  label: string;
  message: string;
};

export type MaterialStatsResponse = {
  material: {
    id: string;
    title: string;
    week: number;
    subjectName: string;
    grade: {
      year: number;
      term: number;
    };
  };
  summary: {
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    totalWrong: number;
    accuracy: number;
    averageScore: number;
    bestScore: number;
    latestScore: number;
  };
  understanding: UnderstandingResult;
  typeStats: Record<QuizType, TypeStat>;
  purposeStats: Record<QuizPurpose, PurposeStat>;
  trend: Array<{
    attemptId: string;
    submittedAt: string | null;
    score: number;
    maxScore: number;
    accuracy: number;
    purpose: QuizPurpose;
  }>;
  weakTopics: TopicStat[];
  recommendations: string[];
};
