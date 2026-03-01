export const SUMMARY_PROMPT_VERSION = "summary_v1";

export function buildSummaryPrompt(input: {
  title: string;
  week: number;
  pages: { page: number; pdfText: string; note: string }[];
}) {
  return `
너는 대학생 학습 도우미다.
아래 입력은 "PDF 원문 텍스트"와 "사용자 메모"다.

규칙(매우 중요):
1) 사실/근거는 PDF 텍스트를 우선한다.
2) 메모는 '강조 포인트/관점/질문/헷갈린 부분'으로 반영한다.
3) 메모 내용이 PDF에서 확인되지 않으면 "메모 기반(원문에서 확인 불가)"라고 표시한다.
4) 핵심 bullet마다 가능한 한 (p.X) 출처를 붙인다.
5) 출력은 아래 형식을 정확히 따른다.

[출력 형식]
# {주차}주차 요약: {제목}
## 핵심 개념(5~10개)
- (p.?) ...
## 사용자가 강조한 포인트(메모 반영)
- (p.?) ...
## 헷갈리기 쉬운/오개념 주의
- (p.?) ...
## 시험/퀴즈 포인트
- (p.?) ...

[입력]
제목: ${input.title}
주차: ${input.week}

페이지들(JSON):
${JSON.stringify(input.pages, null, 2)}
`.trim();
}