import type { MaterialPacket, NoteSignals } from "@/lib/materialPacket";

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
    answerKey: any;
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

export interface AIProvider {
  buildSummary(input: { packet: MaterialPacket }): Promise<SummaryResult>;
  generateQuiz(input: {
    summary: string;
    notes: Array<{ page: number; note: string; signals: NoteSignals | null }>;
    spec: { mcqCount: number; tfCount: number; shortCount: number };
  }): Promise<QuizResult>;
}
