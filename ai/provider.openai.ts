import OpenAI from "openai";
import { z } from "zod";
import type { AIProvider, QuizResult, SummaryResult } from "./types";
import { buildSummaryPrompt } from "./prompts/summary_v1";
import { buildQuizPrompt, QUIZ_PROMPT_VERSION } from "./prompts/quiz_v1";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QuizItemSchema = z.object({
  type: z.enum(["mcq", "tf", "short"]),
  question: z.string().min(1),
  choices: z.array(z.string()).optional().nullable(),
  answerKey: z.any(),
  explanation: z.string().min(1),
  topic: z.string().optional().nullable(),
  points: z.number().int().min(1).optional(),
  evidence: z
    .object({
      source: z.enum(["note", "mixed", "pdf"]),
      page: z.number().int().positive().optional(),
      quote: z.string().optional(),
    })
    .optional(),
  signalHits: z.array(z.string()).optional(),
});

const QuizSchema = z.object({
  title: z.string().optional(),
  items: z.array(QuizItemSchema).min(1),
});

async function responseText(prompt: string) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const r = await client.responses.create({
    model,
    input: [
      {
        role: "developer",
        content: "You are a precise assistant. Follow the user's instructions exactly.",
      },
      { role: "user", content: prompt },
    ],
  });

  // @ts-ignore
  return (r as any).output_text?.trim?.() ?? "";
}

function normalizeJsonObject(raw: string) {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw;
}

function noteCoverage(items: Array<{ evidence?: { source?: string } }>) {
  if (items.length === 0) return 0;
  const hits = items.filter((it) => {
    const src = it.evidence?.source;
    return src === "note" || src === "mixed";
  }).length;
  return hits / items.length;
}

export const OpenAIProvider: AIProvider = {
  async buildSummary({ packet }): Promise<SummaryResult> {
    const prompt = buildSummaryPrompt({
      title: packet.title,
      week: packet.week,
      pages: packet.pages.map((p) => ({
        page: p.page,
        pdfText: p.pdfText,
        note: p.note,
        noteSignals: p.noteSignals,
      })),
    });

    const text = await responseText(prompt);
    if (!text) throw new Error("Empty summary from model");

    return {
      content: text,
      canonical: text,
      adaptive: text,
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      promptVersion: packet.promptVersion,
    };
  },

  async generateQuiz({ summary, notes, spec }): Promise<QuizResult> {
    const prompt = buildQuizPrompt(summary, notes, spec);

    let raw = await responseText(prompt);
    raw = normalizeJsonObject(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const fixPrompt = `${prompt}\n\n위 지시를 그대로 따르되, 유효한 JSON 객체 하나만 다시 출력해라. 다른 텍스트는 절대 출력하지 마라.`;
      let raw2 = await responseText(fixPrompt);
      raw2 = normalizeJsonObject(raw2);
      parsed = JSON.parse(raw2);
    }

    let validated = QuizSchema.parse(parsed);

    const hasAnyNote = notes.some((n) => n.note.trim().length > 0);
    if (hasAnyNote && noteCoverage(validated.items) < 0.5) {
      const retryPrompt = `${prompt}\n\n중요: note 또는 mixed evidence 비율을 최소 50% 이상으로 높여서 다시 생성해라.`;
      let retryRaw = await responseText(retryPrompt);
      retryRaw = normalizeJsonObject(retryRaw);
      const retryParsed = JSON.parse(retryRaw);
      validated = QuizSchema.parse(retryParsed);
    }

    const items = validated.items.map((it) => {
      const normalized = {
        ...it,
        choices: it.choices ?? null,
        topic: it.topic?.trim() || "기타 개념",
        points: it.points ?? 1,
        evidence: it.evidence ?? { source: "pdf" as const },
        signalHits: it.signalHits ?? [],
      };

      if (normalized.type === "mcq") {
        if (!Array.isArray(normalized.choices) || normalized.choices.length < 2) {
          throw new Error("mcq choices must be a string[] with length >= 2");
        }
        if (typeof normalized.answerKey?.correctIndex !== "number") {
          throw new Error("mcq answerKey.correctIndex missing");
        }
      }

      if (normalized.type === "tf") {
        if (typeof normalized.answerKey?.correct !== "boolean") {
          throw new Error("tf answerKey.correct missing");
        }
      }

      if (normalized.type === "short") {
        if (!Array.isArray(normalized.answerKey?.accepted)) {
          throw new Error("short answerKey.accepted missing");
        }
      }

      return normalized;
    });

    return {
      title: validated.title,
      items,
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      promptVersion: QUIZ_PROMPT_VERSION,
    };
  },
};
