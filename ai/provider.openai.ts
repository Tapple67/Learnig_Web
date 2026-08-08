import OpenAI from "openai";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseFormatTextJSONSchemaConfig,
} from "openai/resources/responses/responses";
import type { ReasoningEffort } from "openai/resources/shared";
import { z } from "zod";
import type { AIProvider, QuizResult, SummaryResult } from "./types";
import { buildSummaryPrompt } from "./prompts/summary_v1";
import {
  buildQuizCritiquePrompt,
  buildQuizPrompt,
  buildQuizRepairPrompt,
  QUIZ_PROMPT_VERSION,
} from "./prompts/quiz_v1";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUIZ_GENERATOR_MODEL = process.env.OPENAI_QUIZ_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.2";
const QUIZ_CRITIC_MODEL = process.env.OPENAI_QUIZ_CRITIC_MODEL ?? "gpt-5-mini";
const SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-mini";

function reasoningEffortFromEnv(value: string | undefined, fallback: Exclude<ReasoningEffort, null>) {
  const allowed = new Set(["none", "minimal", "low", "medium", "high", "xhigh"]);
  return allowed.has(value ?? "") ? (value as Exclude<ReasoningEffort, null>) : fallback;
}

const QUIZ_GENERATOR_REASONING = reasoningEffortFromEnv(
  process.env.OPENAI_QUIZ_REASONING_EFFORT,
  "low"
);
const QUIZ_CRITIC_REASONING = reasoningEffortFromEnv(
  process.env.OPENAI_QUIZ_CRITIC_REASONING_EFFORT,
  "minimal"
);
const SUMMARY_REASONING = reasoningEffortFromEnv(process.env.OPENAI_SUMMARY_REASONING_EFFORT, "low");
const QUIZ_CRITIQUE_ENABLED = process.env.OPENAI_QUIZ_CRITIQUE_ENABLED === "true";

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

const QuizCritiqueSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      score: z.number().int().min(1).max(5),
      problems: z.array(z.string()).optional(),
      regenerate: z.boolean().optional(),
    })
  ),
  regenerateIndexes: z.array(z.number().int().min(0)).optional(),
});

const QuizResponseFormat: ResponseFormatTextJSONSchemaConfig = {
  type: "json_schema",
  name: "quiz_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", enum: ["mcq", "tf", "short"] },
            question: { type: "string" },
            choices: {
              anyOf: [
                { type: "array", items: { type: "string" } },
                { type: "null" },
              ],
            },
            answerKey: {
              anyOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  properties: { correctIndex: { type: "integer" } },
                  required: ["correctIndex"],
                },
                {
                  type: "object",
                  additionalProperties: false,
                  properties: { correct: { type: "boolean" } },
                  required: ["correct"],
                },
                {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    accepted: { type: "array", items: { type: "string" } },
                  },
                  required: ["accepted"],
                },
              ],
            },
            explanation: { type: "string" },
            topic: { type: "string" },
            points: { type: "integer", minimum: 1 },
            evidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                source: { type: "string", enum: ["note", "mixed", "pdf"] },
                page: { type: "integer", minimum: 1 },
                quote: { type: "string" },
              },
              required: ["source", "page", "quote"],
            },
            signalHits: { type: "array", items: { type: "string" } },
          },
          required: [
            "type",
            "question",
            "choices",
            "answerKey",
            "explanation",
            "topic",
            "points",
            "evidence",
            "signalHits",
          ],
        },
      },
    },
    required: ["title", "items"],
  },
};

const QuizCritiqueResponseFormat: ResponseFormatTextJSONSchemaConfig = {
  type: "json_schema",
  name: "quiz_critique",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 0 },
            score: { type: "integer", minimum: 1, maximum: 5 },
            problems: { type: "array", items: { type: "string" } },
            regenerate: { type: "boolean" },
          },
          required: ["index", "score", "problems", "regenerate"],
        },
      },
      regenerateIndexes: { type: "array", items: { type: "integer", minimum: 0 } },
    },
    required: ["items", "regenerateIndexes"],
  },
};

async function responseText(
  prompt: string,
  options?: {
    model?: string;
    reasoningEffort?: ReasoningEffort;
    responseFormat?: ResponseFormatTextJSONSchemaConfig;
  }
) {
  const requestBase: Omit<ResponseCreateParamsNonStreaming, "reasoning"> = {
    model: options?.model ?? SUMMARY_MODEL,
    text: options?.responseFormat ? { format: options.responseFormat } : undefined,
    input: [
      {
        role: "developer",
        content: "You are a precise assistant. Follow the user's instructions exactly.",
      },
      { role: "user", content: prompt },
    ],
  };

  const request: ResponseCreateParamsNonStreaming = {
    ...requestBase,
    reasoning: options?.reasoningEffort ? { effort: options.reasoningEffort } : undefined,
  };

  let r: Awaited<ReturnType<typeof client.responses.create>>;
  try {
    r = await client.responses.create(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("reasoning.effort")) throw error;
    r = await client.responses.create(requestBase);
  }

  const outputText = (r as { output_text?: unknown }).output_text;
  return typeof outputText === "string" ? outputText.trim() : "";
}

function normalizeJsonObject(raw: string) {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw;
}

async function parseJsonWithRepair<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options: {
    model: string;
    reasoningEffort: ReasoningEffort;
    responseFormat: ResponseFormatTextJSONSchemaConfig;
  }
): Promise<T> {
  let raw = await responseText(prompt, options);
  raw = normalizeJsonObject(raw);

  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    const fixPrompt = `${prompt}\n\n위 지시를 그대로 따르되, 유효한 JSON 객체 하나만 다시 출력해라. 다른 텍스트는 절대 출력하지 마라.`;
    let raw2 = await responseText(fixPrompt, options);
    raw2 = normalizeJsonObject(raw2);
    return schema.parse(JSON.parse(raw2));
  }
}

function noteCoverage(items: Array<{ evidence?: { source?: string } }>) {
  if (items.length === 0) return 0;
  const hits = items.filter((it) => {
    const src = it.evidence?.source;
    return src === "note" || src === "mixed";
  }).length;
  return hits / items.length;
}

function expectedItemCount(spec: { mcqCount: number; tfCount: number; shortCount: number }) {
  return spec.mcqCount + spec.tfCount + spec.shortCount;
}

function hasLowQualityItems(critique: z.infer<typeof QuizCritiqueSchema>) {
  return critique.items.some((item) => item.score <= 2 || item.regenerate);
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

    const text = await responseText(prompt, {
      model: SUMMARY_MODEL,
      reasoningEffort: SUMMARY_REASONING,
    });
    if (!text) throw new Error("Empty summary from model");

    return {
      content: text,
      canonical: text,
      adaptive: text,
      provider: "openai",
      model: SUMMARY_MODEL,
      promptVersion: packet.promptVersion,
    };
  },

  async generateQuiz({ summary, notes, sourcePages, spec, focus }): Promise<QuizResult> {
    const prompt = buildQuizPrompt(summary, notes, sourcePages, spec, focus);
    const generatorOptions = {
      model: QUIZ_GENERATOR_MODEL,
      reasoningEffort: QUIZ_GENERATOR_REASONING,
      responseFormat: QuizResponseFormat,
    };

    let validated = await parseJsonWithRepair(prompt, QuizSchema, generatorOptions);

    if (validated.items.length !== expectedItemCount(spec)) {
      const countFixPrompt = `${prompt}\n\n중요: 문항 수를 정확히 맞춰라. mcq ${spec.mcqCount}개, tf ${spec.tfCount}개, short ${spec.shortCount}개를 포함한 전체 JSON 객체 하나만 출력해라.`;
      validated = await parseJsonWithRepair(countFixPrompt, QuizSchema, generatorOptions);
    }

    const hasAnyNote = notes.some((n) => n.note.trim().length > 0);
    if (hasAnyNote && noteCoverage(validated.items) < 0.4) {
      const retryPrompt = `${prompt}\n\n중요: note 또는 mixed evidence 비율을 최소 50% 이상으로 높여서 다시 생성해라.`;
      validated = await parseJsonWithRepair(retryPrompt, QuizSchema, generatorOptions);
    }

    if (QUIZ_CRITIQUE_ENABLED) {
      try {
        const critique = await parseJsonWithRepair(
          buildQuizCritiquePrompt(validated, notes),
          QuizCritiqueSchema,
          {
            model: QUIZ_CRITIC_MODEL,
            reasoningEffort: QUIZ_CRITIC_REASONING,
            responseFormat: QuizCritiqueResponseFormat,
          }
        );

        if (hasLowQualityItems(critique)) {
          validated = await parseJsonWithRepair(
            buildQuizRepairPrompt(prompt, validated, critique),
            QuizSchema,
            generatorOptions
          );
        }
      } catch {
        // Critique improves quality, but quiz generation should not fail only because review failed.
      }
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
      model: `${QUIZ_GENERATOR_MODEL} (critic: ${QUIZ_CRITIC_MODEL})`,
      promptVersion: QUIZ_PROMPT_VERSION,
    };
  },
};
