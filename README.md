# Learning App

PDF 강의 자료를 과목/학기별로 관리하고, 페이지별 기록을 남긴 뒤 AI 요약과 퀴즈를 생성해 학습을 돕는 Next.js 기반 웹 애플리케이션입니다.

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 학기, 과목, 주차별 PDF 자료 관리
- PDF 업로드 및 페이지별 텍스트 추출
- PDF 페이지별 개인 기록 작성
- 자료 기반 AI 요약 생성
- 자료/기록 기반 AI 퀴즈 생성
- 객관식, OX, 단답형 퀴즈 풀이 및 채점
- 퀴즈 결과 확인
- 최근 활동 로그를 통한 기록/퀴즈 이어가기
- 과목 및 자료별 학습 통계
- 마이페이지 학습 목표 관리

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- OpenAI API
- Supabase Storage
- pdfjs / react-pdf

## 프로젝트 구조

```txt
app/
  api/                 API routes
  (auth)/              로그인/회원가입 화면
  (main)/              로그인 후 사용하는 주요 화면
    _home/             홈 대시보드 및 최근 활동
    subject/           학기/과목/자료/컨텐츠 관리
    record/            PDF 뷰어 및 페이지별 기록
    quiz/              퀴즈 풀이/결과 화면
    stats/             학습 통계
    mypage/            목표 설정 및 마이페이지
ai/
  prompts/             요약/퀴즈 프롬프트
  provider.openai.ts   OpenAI provider 구현
lib/
  auth.ts              인증 유틸
  authz.ts             소유권 검증
  db.ts                Prisma client
  activity.ts          활동 로그 기록
prisma/
  schema.prisma        DB 스키마
scripts/
  worker.ts            백그라운드 작업 처리
public/
  uploads/             로컬 업로드 파일
```

## 시작하기

의존성을 설치합니다.

```bash
npm install
```

환경변수 파일을 준비합니다.

```bash
cp .env.example .env
```

필요한 환경변수를 채웁니다.

```env
DATABASE_URL=""
JWT_SECRET=""

OPENAI_API_KEY=""
OPENAI_SUMMARY_MODEL=
OPENAI_QUIZ_MODEL=      
OPENAI_QUIZ_CRITIC_MODEL=
OPENAI_QUIZ_CRITIQUE_ENABLED=                        //true or false

SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

Prisma client를 생성하고 DB 마이그레이션을 적용합니다.

```bash
npx prisma generate
npx prisma migrate dev
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```txt
http://localhost:3000
```



## AI 퀴즈 생성 설정

퀴즈 생성은 기본적으로 자료 요약, 사용자 기록, 관련 PDF 원문 일부를 기반으로 동작합니다.

`OPENAI_QUIZ_CRITIQUE_ENABLED`는 퀴즈 검수/수정 단계를 켜는 옵션입니다.

```env
OPENAI_QUIZ_CRITIQUE_ENABLED=true
```

위처럼 설정하면 AI가 생성된 퀴즈를 한 번 더 검수하고, 품질이 낮은 문항을 수정합니다. 속도를 우선하려면 비워두거나 `false`로 둡니다.

```env
OPENAI_QUIZ_CRITIQUE_ENABLED=false
```

