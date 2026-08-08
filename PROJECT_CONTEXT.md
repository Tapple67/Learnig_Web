# 프로젝트 컨텍스트

이 문서는 이 프로젝트를 처음 이어받는 사용자나 에이전트가 빠르게 방향을 잡기 위한 작업 인수인계 문서입니다. 실제 비밀값이 들어 있는 `.env` 파일은 읽거나 수정하지 마세요.

## 한 줄 요약

Next.js App Router 기반의 학습 관리 앱입니다. 사용자가 학기/과목/주차별 PDF 자료를 업로드하고, 페이지별 필기와 PDF 추출 텍스트를 바탕으로 AI 요약 및 퀴즈를 생성해 학습 기록과 통계를 확인하는 흐름을 제공합니다.

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 학기와 과목 관리
- 과목별 주차 PDF 자료 업로드
- Supabase Storage에 PDF 저장
- 백그라운드 워커를 통한 PDF 페이지 텍스트 추출
- PDF 뷰어에서 페이지별 개인 노트 작성
- 자료 텍스트와 노트를 기반으로 AI 요약 생성
- 객관식, OX, 단답형 퀴즈 생성 및 풀이
- 퀴즈 결과, 오답/취약 주제 기반 복습 흐름
- 최근 활동, 자료별 통계, 마이페이지 학습 목표 관리

## 기술 스택

- Next.js 15 App Router
- React 18
- TypeScript
- Prisma 5
- PostgreSQL
- Tailwind CSS
- OpenAI API
- Supabase Storage
- pdfjs-dist / react-pdf

## 실행 방법

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

개발 서버 기본 주소는 `http://localhost:3000` 입니다.

PDF 텍스트 추출 워커는 별도 프로세스로 실행합니다.

```bash
npx tsx scripts/worker.ts
```

## 환경 변수

`.env.example`에 필요한 키 목록이 있습니다. 실제 `.env`는 비밀값을 포함하므로 접근하지 마세요.

필요한 주요 값:

- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_SUMMARY_MODEL`
- `OPENAI_QUIZ_MODEL`
- `OPENAI_QUIZ_CRITIC_MODEL`
- `OPENAI_QUIZ_CRITIQUE_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 디렉터리 구조

```txt
app/
  api/                 API Route 모음
  (auth)/              로그인, 회원가입 화면
  (main)/              로그인 후 사용하는 주요 화면
    _home/             홈 대시보드와 최근 활동
    subject/           학기, 과목, 자료, 요약, 퀴즈 세트 관리
    record/            PDF 뷰어와 페이지별 노트 작성
    quiz/              퀴즈 풀이 및 결과 화면
    stats/             자료별 학습 통계
    mypage/            학습 목표 관리
ai/
  prompts/             요약/퀴즈 프롬프트
  provider.openai.ts   OpenAI provider 구현
  types.ts             AI 입출력 타입
lib/
  auth.ts              JWT 쿠키 인증
  authz.ts             소유권 검증 헬퍼
  db.ts                Prisma client
  storage.ts           Supabase service client
  activity.ts          최근 활동 기록
prisma/
  schema.prisma        DB 모델
  migrations/          Prisma 마이그레이션
scripts/
  worker.ts            PDF 텍스트 추출 Job 처리
public/
  uploads/             기존 로컬 업로드 파일
```

## 핵심 데이터 모델

- `User`: 계정 정보
- `Grade`: 사용자별 학년/학기
- `Subject`: 학기 안의 과목
- `Material`: 과목별 주차 PDF 자료
- `MaterialPageText`: PDF에서 추출한 페이지별 텍스트
- `Note`: 사용자가 작성한 페이지별 노트
- `MaterialSummary`: AI 요약 캐시
- `QuizSet`, `QuizItem`: 생성된 퀴즈 묶음과 문항
- `QuizAttempt`, `QuizAnswer`: 풀이 시도와 답안
- `ActivityLog`: 최근 활동
- `Job`: 백그라운드 작업 큐
- `Goal`: 학습 목표

## 주요 흐름

1. 사용자가 로그인합니다.
2. 학기와 과목을 선택하거나 생성합니다.
3. `/record` 화면에서 PDF를 업로드합니다.
4. `POST /api/materials`가 `Material`을 만들고 Supabase Storage에 PDF를 저장한 뒤 `EXTRACT_PDF` Job을 생성합니다.
5. `scripts/worker.ts`가 Job을 가져와 PDF 페이지별 텍스트를 추출하고 `MaterialPageText`에 저장합니다.
6. 사용자는 PDF를 보면서 페이지별 노트를 작성합니다.
7. `/subject` 화면에서 선택한 자료의 요약과 퀴즈를 생성하거나 확인합니다.
8. 퀴즈 풀이 결과는 통계와 복습용 퀴즈 생성 흐름에 사용됩니다.

## 개발할 때 주의할 점

- `.env` 파일은 읽거나 쓰지 마세요. 필요한 키 이름은 `.env.example`만 확인하세요.
- 현재 `README.md`와 일부 기존 주석/문자열은 인코딩이 깨져 보일 수 있습니다. 새 문서는 UTF-8 한글로 유지하는 편이 좋습니다.
- 작업 전 `git status --short`로 기존 사용자 변경사항을 확인하세요.
- 이미 수정된 파일을 건드릴 때는 사용자 변경을 되돌리지 말고, 필요한 범위만 조심스럽게 수정하세요.
- API는 대부분 `getUserId()`로 로그인 여부를 확인하고, Prisma 쿼리에서 `grade.userId` 등을 통해 소유권을 확인합니다.
- PDF 업로드 후 텍스트 추출은 웹 서버가 아니라 워커가 처리합니다. 자료를 업로드했는데 요약/퀴즈 소스가 비어 있으면 워커 실행 여부와 `Job` 상태를 먼저 확인하세요.
- AI 관련 구현은 `ai/provider.openai.ts`, `ai/types.ts`, `ai/prompts/`와 `app/(main)/quiz/hooks/use_summary.ts`, `app/(main)/quiz/hooks/use_quiz.ts`를 함께 확인하세요.

## 유용한 명령어

```bash
npm run lint
npm run build
npm run test:unit
npx prisma studio
npx prisma migrate dev
npx tsx scripts/worker.ts
```

## 이어서 보기 좋은 파일

- `app/(main)/page.tsx`: 홈 대시보드 진입점
- `app/(main)/subject/page.tsx`: 과목/자료/요약/퀴즈 세트 데이터 조합
- `app/(main)/record/page.tsx`: PDF 학습 화면
- `app/api/materials/route.ts`: 자료 목록 조회와 PDF 업로드
- `app/api/quiz/quiz-sets/route.ts`: 퀴즈 세트 생성/조회
- `app/api/attempt/*/route.ts`: 퀴즈 풀이 시작, 답안 저장, 제출, 결과 조회
- `prisma/schema.prisma`: 전체 데이터 모델
- `scripts/worker.ts`: PDF 텍스트 추출 백그라운드 처리
