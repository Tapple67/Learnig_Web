import type { MaterialPacket } from "@/lib/materialPacket";

export type SummaryResult = {
  content: string;
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
  }>;
  provider: string;
  model: string;
  promptVersion: string;
};

export interface AIProvider {
  buildSummary(input: { packet: MaterialPacket }): Promise<SummaryResult>;
  generateQuiz(input: { summary: string; spec: { mcqCount: number; tfCount: number; shortCount: number } }): Promise<QuizResult>;
}