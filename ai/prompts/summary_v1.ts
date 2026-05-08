export const SUMMARY_PROMPT_VERSION = "summary_v3";

export function buildSummaryPrompt(input: {
  title: string;
  week: number;
  pages: { page: number; pdfText: string; note: string; noteSignals?: unknown }[];
}) {
  return `
너는 학습 정리 도우미다.
PDF 텍스트와 사용자 메모를 기반으로 한국어 요약을 생성하라.

규칙:
1) 사실 근거는 PDF 텍스트를 우선한다.
2) 메모의 의도 신호(어려움/쉽게 설명/시험 출제 우선/헷갈림)를 요약 스타일과 강조점에 반영한다.
3) 메모 내용이 PDF에서 검증되지 않으면 "메모 기반(원문 검증 불가)"라고 명시한다.
4) 가능한 경우 각 bullet에 (p.페이지번호)를 붙인다.
5) 질문형 문장으로 끝내지 말고, 설명형/정리형 문장으로 작성한다.
6) 출력은 반드시 한국어로만 작성한다.

출력 형식:
# ${input.week}주차 요약: ${input.title}
## 핵심 개념
- (p.?) ...
## 사용자 메모 반영 포인트
- (p.?) ...
## 쉽게 설명이 필요한 개념
- (p.?) ...
## 퀴즈 출제 포인트
- (p.?) ...

입력 페이지(JSON):
${JSON.stringify(input.pages, null, 2)}
`.trim();
}
