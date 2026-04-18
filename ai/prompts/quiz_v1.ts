export const QUIZ_PROMPT_VERSION = "quiz_v1";

export type QuizGenSpec = {
  mcqCount: number;
  tfCount: number;
  shortCount: number;
};

export function buildQuizPrompt(summaryMarkdown: string, spec: QuizGenSpec) {
  return `
너는 시험 문제를 만드는 출제자다.
아래 "정리본"을 기반으로 퀴즈를 만든다.

규칙:
- 출력은 반드시 JSON 하나만 출력(설명 텍스트 금지).
- 문항 타입은 mcq / tf / short만.
- 각 문항에 explanation(해설) 필수.

- topic은 이 문항이 다루는 핵심 개념/주제를 짧고 명확하게 한글로 작성
예:
  - 프로세스 상태 전이
  - cpu 스케줄링
  - 정규화

topic은 너무 넓지 않게 "이 주제를 점검 해보세요" 라고 할 정도로 작성

- 정답은 answerKey로 표현한다.
  - mcq: { "correctIndex": number }  (0-based)
  - tf:  { "correct": true|false }
  - short: { "accepted": string[] }  // 정답 후보 여러개 가능, 짧게
- 각 items는 반드시 choices 필드를 포함해야 한다.
  - mcq: choices는 string[] (4개 고정)
  - tf: choices는 ["O","X"]
  - short: choices는 null


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
      "points": number
    }
  ]
}

문항 수:
- mcq ${spec.mcqCount}개
- tf ${spec.tfCount}개
- short ${spec.shortCount}개

[정리본]
${summaryMarkdown}
`.trim();
}