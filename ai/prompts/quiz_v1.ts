import type { QuizFocus, QuizSourcePage } from "@/ai/types";

export const QUIZ_PROMPT_VERSION = "quiz_v6_review_focus";

export type QuizGenSpec = {
  mcqCount: number;
  tfCount: number;
  shortCount: number;
};

type NotesContext = Array<{ page: number; note: string; signals: unknown }>;

function buildFocusBlock(focus?: QuizFocus) {
  if (!focus) {
    return "일반 생성 퀴즈다. 요약, 사용자 메모, 원문 근거를 균형 있게 반영한다.";
  }

  if (focus.kind === "WRONG_REVIEW") {
    return `
오답 복습 퀴즈다.
- 아래 오답 문항을 그대로 다시 내지 말고, 같은 개념/오개념을 다른 방식으로 묻는 변형 문항을 만든다.
- 틀린 문항의 topic, explanation, evidence를 우선 반영한다.
- 학습자가 왜 틀렸는지 드러나는 비교형, 적용형, 오개념 진단형 문항을 우선한다.
- topics에 없는 내용으로 크게 벗어나지 않는다.

${JSON.stringify(focus, null, 2)}
`.trim();
  }

  return `
약점 주제 집중 퀴즈다.
- 아래 topics를 최우선 출제 범위로 삼는다.
- 각 주제의 개념 구분, 적용, 오개념 교정을 묻는다.
- 전체 자료를 참고하되 topics와 관련 없는 단순 암기 문항은 피한다.

${JSON.stringify(focus, null, 2)}
`.trim();
}

export function buildQuizPrompt(
  summaryMarkdown: string,
  notesContext: NotesContext,
  sourcePages: QuizSourcePage[],
  spec: QuizGenSpec,
  focus?: QuizFocus
) {
  return `
JSON만 출력해서 퀴즈를 생성해라.
목표는 단순 암기가 아니라 사용자의 개념 이해를 깊게 만드는 것이다.

작업 순서(내부적으로만 수행하고 출력하지 마라):
1) 사용자 메모와 관련 PDF 원문에서 학습자가 헷갈리거나 깊게 이해해야 할 개념 타겟을 고른다.
2) 각 타겟마다 "무엇을 외우는가"가 아니라 "왜 그런가/무엇과 다른가/어떻게 적용되는가"를 묻는 출제 의도를 세운다.
3) 출제 의도에 맞는 깊은 이해형 문항을 만든다.
4) 각 문항이 원문 근거와 메모 의도를 충분히 반영하는지 자체 검수한다.

필수 규칙:
- 유효한 JSON 객체 하나만 출력한다.
- 문항 타입은 mcq, tf, short만 허용한다.
- 모든 문항은 explanation, topic, points를 포함해야 한다.
- 모든 문항은 evidence를 포함해야 한다:
  { "source": "note"|"mixed"|"pdf", "page": number, "quote": string }
- 모든 문항은 signalHits: string[]를 포함해야 한다.
- 질문, 선택지, 해설, 주제명은 반드시 한국어로 작성한다.
- title, question, choices, explanation, topic에는 PDF 페이지 번호나 "몇 페이지", "p.12", "12쪽" 같은 출처 위치 표현을 절대 쓰지 않는다.
- 페이지 정보는 evidence.page 필드에만 기록하고, 학습자가 보는 문항 본문에는 드러내지 않는다.
- 문항은 반드시 학습 내용의 개념 관계, 원리, 비교, 적용, 오개념 교정을 묻는다.
- 메모가 존재하면 전체 문항의 최소 60%는 source가 note 또는 mixed여야 한다.
- 메모가 짧거나 모호하면 같은 페이지 또는 주변 페이지의 PDF 원문으로 개념을 확장해 출제한다.
- evidence.quote는 제공된 메모 또는 PDF 원문에서 확인 가능한 짧은 근거 문장/구절이어야 한다.

깊은 이해형 문항 우선순위:
- 개념 구분형: 비슷한 개념의 기준/조건/결과 차이를 묻는다.
- 원리 적용형: 새로운 상황에 개념을 적용하게 한다.
- 오개념 진단형: 학습자가 착각하기 쉬운 설명을 보기로 넣고 교정한다.
- 이유 설명형: 결과보다 왜 그렇게 되는지 묻는다.
- 비교형: 두 개념의 공통점과 차이를 묻는다.
- 반례형: 어떤 설명이 왜 틀렸는지 판단하게 한다.

금지:
- 단순 용어 뜻만 묻는 문제.
- 자료 자체를 묻는 메타 질문.
  예: "어디 페이지가 중요한가요?", "어떤 페이지를 봐야 하나요?"
- "3페이지에서 설명한 내용", "5쪽의 개념", "p.7에 따르면"처럼 페이지를 언급하는 표현.
- 메모 내용을 그대로 암기시키는 문제.
- 정답이 너무 티 나는 객관식.
- "다음 중 옳은 것은?" 패턴만 반복하는 문제.
- "이것/저것/어디" 같은 모호 지시어만으로 구성된 문항.

해설 규칙:
- 왜 정답인지 설명한다.
- 객관식은 핵심 오답이 왜 틀렸는지도 설명한다.
- 사용자의 메모가 반영된 문항은 메모의 혼동 지점을 풀어주는 문장을 포함한다.
- 해설은 정답 암기가 아니라 개념 관계를 이해하도록 작성한다.

정답 형식:
- mcq: { "correctIndex": number }
- tf: { "correct": true|false }
- short: { "accepted": string[] }

선택지 형식:
- mcq: 보기 4개(string[])
- tf: ["O","X"]
- short: null

JSON 스키마:
{
  "title": string,
  "items": [
    {
      "type": "mcq"|"tf"|"short",
      "question": string,
      "choices": string[] | null,
      "answerKey": object,
      "explanation": string,
      "topic": string,
      "points": number,
      "evidence": { "source": "note"|"mixed"|"pdf", "page": number, "quote": string },
      "signalHits": string[]
    }
  ]
}

문항 수:
- mcq ${spec.mcqCount}
- tf ${spec.tfCount}
- short ${spec.shortCount}

[요약]
${summaryMarkdown}

[출제 초점]
${buildFocusBlock(focus)}

[사용자 메모]
${JSON.stringify(notesContext, null, 2)}

[메모 관련 PDF 원문/주변 페이지]
${JSON.stringify(sourcePages, null, 2)}
`.trim();
}

export function buildQuizCritiquePrompt(
  quizJson: unknown,
  notesContext: NotesContext
) {
  const hasNotes = notesContext.some((n) => n.note.trim().length > 0);
  const noteCriterion = hasNotes
    ? "- noteAlignment: 사용자 메모 또는 메모 의도를 반영하는가."
    : "- noteAlignment: 사용자 메모가 없으므로 감점 기준에서 제외한다.";

  return `
다음 퀴즈를 개념 이해형 학습 문제 기준으로 검수해라.
JSON 객체 하나만 출력한다.

평가 기준:
${noteCriterion}
- grounding: 각 문항의 evidence.quote와 explanation이 서로 충돌하지 않는가.
- conceptualDepth: 단순 암기보다 개념 관계/원리/적용/비교를 묻는가.
- answerClarity: 정답이 명확하고 모호하지 않은가.
- distractorQuality: 객관식 오답이 그럴듯하지만 명확히 틀리는가.
- explanationQuality: 해설이 오개념을 교정하고 이해를 돕는가.

출력 스키마:
{
  "items": [
    {
      "index": number,
      "score": number,
      "problems": string[],
      "regenerate": boolean
    }
  ],
  "regenerateIndexes": number[]
}

규칙:
- index는 0부터 시작한다.
- score는 1~5 정수다.
- score가 2 이하이거나 regenerate가 true인 문항만 regenerateIndexes에 포함한다.
- score 3은 치명적 오류가 없으면 재생성 대상으로 표시하지 않는다.
- 정답이 모호하거나 evidence와 충돌하거나 단순 정의 암기형인 문항은 재생성 대상으로 표시한다.
- 검수는 PDF 원문 전체가 아니라 퀴즈 JSON의 evidence.quote와 사용자 메모만 기준으로 빠르게 수행한다.

[퀴즈 JSON]
${JSON.stringify(quizJson, null, 2)}

[사용자 메모]
${JSON.stringify(notesContext, null, 2)}
`.trim();
}

export function buildQuizRepairPrompt(
  basePrompt: string,
  quizJson: unknown,
  critiqueJson: unknown
) {
  return `
${basePrompt}

위 지시를 그대로 따른다.
아래 기존 퀴즈에서 검수 결과가 나쁜 문항만 깊은 이해형 문항으로 교체하고, 전체 퀴즈 JSON 객체를 다시 출력해라.
좋은 문항은 유지해도 되지만, 전체 문항 수와 JSON 스키마는 반드시 유지한다.

[기존 퀴즈]
${JSON.stringify(quizJson, null, 2)}

[검수 결과]
${JSON.stringify(critiqueJson, null, 2)}
`.trim();
}
