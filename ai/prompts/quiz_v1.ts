export const QUIZ_PROMPT_VERSION = "quiz_v3";

export type QuizGenSpec = {
  mcqCount: number;
  tfCount: number;
  shortCount: number;
};

export function buildQuizPrompt(
  summaryMarkdown: string,
  notesContext: Array<{ page: number; note: string; signals: unknown }>,
  spec: QuizGenSpec
) {
  return `
JSON만 출력해서 퀴즈를 생성해라.
입력으로 제공된 요약과 사용자 메모를 함께 사용해라.

규칙:
- 유효한 JSON 객체 하나만 출력한다.
- 문항 타입은 mcq, tf, short만 허용한다.
- 모든 문항은 explanation, topic, points를 포함해야 한다.
- 모든 문항은 evidence를 포함해야 한다:
  { "source": "note"|"mixed"|"pdf", "page": number, "quote": string }
- 모든 문항은 signalHits: string[]를 포함해야 한다.
- 메모가 존재하면 전체 문항의 최소 60%는 source가 note 또는 mixed여야 한다.
- 질문, 선택지, 해설, 주제명은 반드시 한국어로 작성한다.
- 문항은 반드시 학습 내용(개념/정의/원리/비교/적용)을 묻는 형태로 작성한다.
- 자료 자체를 묻는 메타 질문은 금지한다.
  - 금지 예: "어디 페이지가 중요한가요?", "어떤 페이지를 봐야 하나요?"
- 질문/선택지/해설에 꺾쇠(< >) 같은 플레이스홀더 표기는 절대 사용하지 않는다.
- 문항 본문은 구체 명사(개념명, 용어명)를 포함하고, "이것/저것/어디" 같은 모호 지시어만으로 구성하지 않는다.

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

[메모]
${JSON.stringify(notesContext, null, 2)}
`.trim();
}
