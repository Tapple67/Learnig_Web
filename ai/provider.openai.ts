import OpenAI from "openai";
import { z } from "zod";
import type { AIProvider, QuizResult, SummaryResult } from "./types";
import { buildSummaryPrompt } from "./prompts/summary_v1";
import { buildQuizPrompt, QUIZ_PROMPT_VERSION } from "./prompts/quiz_v1";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ---- Quiz JSON schema (엄격) ----
const QuizItemSchema = z.object({
  type: z.enum(["mcq", "tf", "short"]),
  question: z.string().min(1),
  // ✅ 선택지: 있어도 되고 없어도 됨(특히 short)
  choices: z.array(z.string()).optional().nullable(),
  answerKey: z.any(),
  explanation: z.string().min(1),
  topic: z.string().optional().nullable(),
  points: z.number().int().min(1).optional(),
});

const QuizSchema = z.object({
  title: z.string().optional(),
  items: z.array(QuizItemSchema).min(1),
});

async function responseText(prompt: string) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // Responses API
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

  // JS SDK convenience: output_text
  // (문서에 output_text 언급) :contentReference[oaicite:3]{index=3}
  // @ts-ignore
  return (r as any).output_text?.trim?.() ?? "";
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
      })),
    });

    const text = await responseText(prompt);
    if (!text) throw new Error("Empty summary from model");

    return {
      content: text,
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      promptVersion: packet.promptVersion,
    };
  },

  async generateQuiz({ summary, spec }): Promise<QuizResult> {
    const prompt = buildQuizPrompt(summary, spec);

    // 1차 시도: 그대로 JSON 받기
    let raw = await responseText(prompt);

    // JSON 이외 텍스트가 섞이는 경우 대비(가장 흔함)
    // "{ ... }" 부분만 잘라내기
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 2차 복구 시도: "JSON만 다시 출력" 리프롬프트
      const fixPrompt = `
방금 너의 출력이 JSON 파싱에 실패했다.
오직 JSON 하나만, 위 스키마에 맞춰 다시 출력해라. 다른 텍스트 금지.

[원본 요약]
${summary}
`;
      let raw2 = await responseText(fixPrompt);
      const b1 = raw2.indexOf("{");
      const b2 = raw2.lastIndexOf("}");
      if (b1 !== -1 && b2 !== -1) raw2 = raw2.slice(b1, b2 + 1);
      parsed = JSON.parse(raw2);
    }

    const validated = QuizSchema.parse(parsed);

    // answerKey 형태는 타입별로 최소 보정(안전)
    const items = validated.items.map((it) => {
  const normalized = {
    ...it,
    choices: it.choices ?? null, // ✅ undefined -> null
    topic: it.topic?.trim() || "기타 개념",
    points: it.points ?? 1,
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
    // tf는 choices 없어도 되지만, 너 UI에서 O/X를 따로 그리고 있으니 OK
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
