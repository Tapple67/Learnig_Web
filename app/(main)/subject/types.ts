export type Grade = { id: string; year: number; term: number | null };
export type Subject = { id: string; name: string; gradeId: string; createdAt: Date };
export type Material = { id: string; week: number; title: string; createdAt: Date };

export type QuizSetCard = {
  id: string;
  title: string | null;
  createdAt: string;
  itemCount: number;
  latestAttempt: null | {
    id: string;
    status: string;
    score: number | null;
    maxScore: number | null;
  };
};

export type SelectedMaterial = {
  id: string;
  title: string;
  week: number;
  summary: null | {
    id: string;
    updatedAt: string;
    provider: string | null;
    model: string | null;
  };
};

export type ContentFilter = "all" | "summary" | "quiz";
export type SortOrder = "latest" | "oldest";
