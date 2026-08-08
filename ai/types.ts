import type { MaterialPacket, NoteSignals } from "@/app/(main)/quiz/utils/material_packet";

export type SummaryResult = {
  content: string;
  canonical?: string;
  adaptive?: string;
  provider: string;
  model: string;
  promptVersion: string;
};

export type QuizResult = {
  title?: string;
  items: Array<{
    type: "mcq" | "tf" | "short";
    question: string;
    choices: string[] | null;
    answerKey: Record<string, unknown>;
    explanation: string;
    topic?: string | null;
    points?: number;
    evidence?: {
      source: "note" | "mixed" | "pdf";
      page?: number;
      quote?: string;
    };
    signalHits?: string[];
  }>;
  provider: string;
  model: string;
  promptVersion: string;
};

export type QuizSourcePage = {
  page: number;
  pdfText: string;
  note: string;
  signals: NoteSignals | null;
};

export type QuizFocus =
  | {
      kind: "WRONG_REVIEW";
      topics: string[];
      wrongItems: Array<{
        question: string;
        topic: string;
        explanation?: string | null;
        evidence?: unknown;
      }>;
    }
  | {
      kind: "WEAK_TOPIC";
      topics: string[];
    };

export interface AIProvider {
  buildSummary(input: { packet: MaterialPacket }): Promise<SummaryResult>;
  generateQuiz(input: {
    summary: string;
    notes: Array<{ page: number; note: string; signals: NoteSignals | null }>;
    sourcePages: QuizSourcePage[];
    spec: { mcqCount: number; tfCount: number; shortCount: number };
    focus?: QuizFocus;
  }): Promise<QuizResult>;
}
