// lib/stats/utils.ts

import type { PurposeStat, QuizPurpose, QuizType, TopicStat, TypeStat, UnderstandingResult } from "../types";

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function toPercent(correct: number, total: number) {
  if (total <= 0) return 0;
  return round1((correct / total) * 100);
}

export function getEmptyTypeStats(): Record<QuizType, TypeStat> {
  return {
    mcq: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
    tf: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
    short: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
  };
}

export function getUnderstandingLevel(accuracy: number): UnderstandingResult {
  if (accuracy >= 85) {
    return {
      level: "HIGH",
      label: "이해도 높음",
      message: "이 파일의 전반적인 이해도가 높은 편입니다.",
    };
  }

  if (accuracy >= 70) {
    return {
      level: "MID_HIGH",
      label: "이해도 보통 이상",
      message: "핵심 내용은 이해했지만 일부 개념 점검이 필요합니다.",
    };
  }

  if (accuracy >= 50) {
    return {
      level: "MID_LOW",
      label: "일부 복습 필요",
      message: "이 파일의 핵심 개념을 한 번 더 점검하는 것이 좋습니다.",
    };
  }

  return {
    level: "LOW",
    label: "복습 권장",
    message: "이 파일은 전반적인 복습이 필요합니다.",
  };
}

export function buildRecommendations(params: {
  overallAccuracy: number;
  typeStats: Record<QuizType, TypeStat>;
  weakTopics: TopicStat[];
}) {
  const messages: string[] = [];
  const { overallAccuracy, typeStats, weakTopics } = params;

  if (overallAccuracy < 50) {
    messages.push("이 파일은 전반적으로 다시 점검하는 것이 좋습니다.");
  } else if (overallAccuracy < 70) {
    messages.push("핵심 개념을 중심으로 한 번 더 복습해보세요.");
  }

  if (typeStats.short.total > 0 && typeStats.short.accuracy < 60) {
    messages.push("서술형 문제에서 개념 설명이 부족할 수 있습니다.");
  }

  if (typeStats.mcq.total > 0 && typeStats.mcq.accuracy < 60) {
    messages.push("객관식 문제에서 선지 구분 연습이 필요합니다.");
  }

  if (typeStats.tf.total > 0 && typeStats.tf.accuracy < 60) {
    messages.push("OX 문제에서 기본 개념 구분을 다시 확인해보세요.");
  }

  for (const topic of weakTopics.slice(0, 3)) {
    messages.push(`"${topic.topic}" 주제를 점검해보세요.`);
  }

  return Array.from(new Set(messages)).slice(0, 5);
}

export function getEmptyPurposeStats(): Record<QuizPurpose, PurposeStat> {
  return {
    GENERAL: { attempts: 0, total: 0, correct: 0, wrong: 0, accuracy: 0 },
    WRONG_REVIEW: { attempts: 0, total: 0, correct: 0, wrong: 0, accuracy: 0 },
    WEAK_TOPIC: { attempts: 0, total: 0, correct: 0, wrong: 0, accuracy: 0 },
  };
}

export function normalizeQuizPurpose(value: unknown): QuizPurpose {
  if (value === "WRONG_REVIEW" || value === "WEAK_TOPIC") return value;
  return "GENERAL";
}
