import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { updateGoalAction } from "./actions";

export const dynamic = "force-dynamic";

type RecentItem = {
  type: string;
  title: string;
  right: string;
  date: string;
  createdAt: Date;
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "-";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}`;
}

function percent(current: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
}

function getAttemptDate(attempt: {
  gradedAt: Date | null;
  submittedAt: Date | null;
  startedAt: Date;
}) {
  return attempt.gradedAt ?? attempt.submittedAt ?? attempt.startedAt;
}

export default async function MyPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) redirect("/login");

  const todayStart = startOfDay();
  const tomorrowStart = startOfTomorrow();
  const weekStart = startOfWeek();

  const goal = await prisma.goal.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId, status: { in: ["SUBMITTED", "GRADED"] } },
    include: {
      quizSet: {
        include: {
          material: { include: { subject: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const quizAnswers = await prisma.quizAnswer.findMany({
    where: {
      attempt: {
        userId,
        status: { in: ["SUBMITTED", "GRADED"] },
      },
      isCorrect: { not: null },
    },
    select: { isCorrect: true },
  });

  const activityLogs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const subjects = await prisma.subject.findMany({
    where: { grade: { userId } },
    include: {
      grade: true,
      materials: {
        include: {
          quizSets: {
            include: {
              attempts: {
                where: { userId, status: { in: ["SUBMITTED", "GRADED"] } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalQuizCount = quizAttempts.length;
  const correctCount = quizAnswers.filter((answer) => answer.isCorrect).length;
  const totalAnswerCount = quizAnswers.length;
  const accuracy = totalAnswerCount === 0 ? 0 : Math.round((correctCount / totalAnswerCount) * 100);

  const todayQuizCount = quizAttempts.filter((attempt) => {
    const date = getAttemptDate(attempt);
    return date >= todayStart && date < tomorrowStart;
  }).length;

  const weeklyQuizCount = quizAttempts.filter((attempt) => getAttemptDate(attempt) >= weekStart).length;

  const todayMaterialActivityCount = activityLogs.filter((log) => log.updatedAt >= todayStart && log.updatedAt < tomorrowStart).length;
  const weeklyMaterialActivityCount = activityLogs.filter((log) => log.updatedAt >= weekStart).length;

  const subjectStats = subjects.map((subject) => {
    let scoreSum = 0;
    let maxScoreSum = 0;

    subject.materials.forEach((material) => {
      material.quizSets.forEach((quizSet) => {
        quizSet.attempts.forEach((attempt) => {
          if (typeof attempt.score === "number" && typeof attempt.maxScore === "number") {
            scoreSum += attempt.score;
            maxScoreSum += attempt.maxScore;
          }
        });
      });
    });

    const rate = maxScoreSum === 0 ? 0 : Math.round((scoreSum / maxScoreSum) * 100);
    return { name: subject.name, rate };
  });

  const last7Days = Array.from({ length: 7 }).map((_, index) => {
    const d = startOfDay();
    d.setDate(d.getDate() - (6 - index));
    return d;
  });

  const chartData = last7Days.map((day) => {
    const next = startOfDay(day);
    next.setDate(next.getDate() + 1);

    const dayAttempts = quizAttempts.filter((attempt) => {
      const date = getAttemptDate(attempt);
      return date >= day && date < next;
    });

    const scoreSum = dayAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
    const maxScoreSum = dayAttempts.reduce((sum, attempt) => sum + (attempt.maxScore ?? 0), 0);
    const rate = maxScoreSum === 0 ? 0 : Math.round((scoreSum / maxScoreSum) * 100);

    return { label: formatDate(day), rate };
  });

  const quizRecentItems: RecentItem[] = quizAttempts.slice(0, 8).map((attempt) => {
    const material = attempt.quizSet.material;
    const subject = material.subject;

    return {
      type: "퀴즈",
      title: `${subject.name} - ${attempt.quizSet.title ?? material.title}`,
      right:
        typeof attempt.score === "number" && typeof attempt.maxScore === "number"
          ? `${attempt.score}/${attempt.maxScore}`
          : "-",
      date: formatDate(getAttemptDate(attempt)),
      createdAt: getAttemptDate(attempt),
    };
  });

  const activityRecentItems: RecentItem[] = activityLogs.slice(0, 8).map((log) => ({
    type: log.type === "FILE_UPLOAD" ? "자료" : "기록",
    title: log.title || log.materialTitle,
    right: log.subjectName,
    date: formatDate(log.updatedAt),
    createdAt: log.updatedAt,
  }));

  const recentItems = [...quizRecentItems, ...activityRecentItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const studyRecords = quizRecentItems.slice(0, 5);
  const materialRecords = activityRecentItems.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-[1500px] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-end gap-5">
          <h1 className="text-4xl font-bold tracking-tight">마이페이지</h1>
          <p className="pb-1 text-sm text-slate-500">나의 학습 현황과 활동을 한눈에 확인하세요.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-4xl font-semibold text-white">
                  {user.email.slice(0, 1).toUpperCase()}
                </div>
                <h2 className="mt-4 text-2xl font-bold">{user.email.split("@")[0]}</h2>
                <p className="mt-1 text-sm text-slate-500">안녕하세요, 열심히 학습해봐요!</p>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">학습 요약</h3>
                  <span className="text-xs text-slate-400">전체 기준</span>
                </div>

                <SummaryRow label="퀴즈 풀이" value={`${totalQuizCount}개`} color="bg-indigo-100" />
                <SummaryRow label="정답률" value={`${accuracy}%`} color="bg-emerald-100" />
                <SummaryRow label="오늘 퀴즈" value={`${todayQuizCount}개`} color="bg-amber-100" />
                <SummaryRow label="이번 주 퀴즈" value={`${weeklyQuizCount}개`} color="bg-rose-100" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold">목표</h3>
                <span className="text-xs text-slate-400">실제 기록 연동</span>
              </div>

              <GoalRow title="일일 퀴즈 풀이 목표" value={`${todayQuizCount} / ${goal.dailyQuizGoal}`} percent={percent(todayQuizCount, goal.dailyQuizGoal)} bar="bg-indigo-500" />
              <GoalRow title="주간 퀴즈 풀이 목표" value={`${weeklyQuizCount} / ${goal.weeklyQuizGoal}`} percent={percent(weeklyQuizCount, goal.weeklyQuizGoal)} bar="bg-blue-500" />
              <GoalRow title="일일 자료 활동 목표" value={`${todayMaterialActivityCount} / ${goal.dailyMaterialGoal}`} percent={percent(todayMaterialActivityCount, goal.dailyMaterialGoal)} bar="bg-emerald-500" />
              <GoalRow title="주간 자료 활동 목표" value={`${weeklyMaterialActivityCount} / ${goal.weeklyMaterialGoal}`} percent={percent(weeklyMaterialActivityCount, goal.weeklyMaterialGoal)} bar="bg-teal-500" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold">목표 설정</h3>

              <form action={updateGoalAction} className="space-y-4">
                <GoalInput label="일일 퀴즈 목표" name="dailyQuizGoal" defaultValue={goal.dailyQuizGoal} />
                <GoalInput label="주간 퀴즈 목표" name="weeklyQuizGoal" defaultValue={goal.weeklyQuizGoal} />
                <GoalInput label="일일 자료 활동 목표" name="dailyMaterialGoal" defaultValue={goal.dailyMaterialGoal} />
                <GoalInput label="주간 자료 활동 목표" name="weeklyMaterialGoal" defaultValue={goal.weeklyMaterialGoal} />

                <button type="submit" className="mt-2 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700">
                  목표 저장
                </button>
              </form>
            </section>
          </aside>

          <section className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">최근 학습 흐름</h3>
              </div>
              <LineChart data={chartData} />
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title="과목별 성취도">
                {subjectStats.length === 0 ? (
                  <EmptyText text="등록된 과목 또는 퀴즈 기록이 없습니다." />
                ) : (
                  <div className="space-y-5">
                    {subjectStats.map((subject) => (
                      <ProgressRow key={subject.name} label={subject.name} value={subject.rate} />
                    ))}
                  </div>
                )}
              </Card>

              <Card title="최근 활동">
                {recentItems.length === 0 ? (
                  <EmptyText text="최근 활동이 없습니다." />
                ) : (
                  <div className="space-y-1">
                    {recentItems.map((item, index) => (
                      <ActivityRow key={`${item.title}-${index}`} item={item} />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title="학습 기록">
                {studyRecords.length === 0 ? (
                  <EmptyText text="아직 퀴즈 기록이 없습니다." />
                ) : (
                  studyRecords.map((record, index) => (
                    <ListRow key={`${record.title}-${index}`} title={record.title} right={record.right} sub={record.date} />
                  ))
                )}
              </Card>

              <Card title="자료 활동">
                {materialRecords.length === 0 ? (
                  <EmptyText text="아직 자료 활동 기록이 없습니다." />
                ) : (
                  materialRecords.map((record, index) => (
                    <ListRow key={`${record.title}-${index}`} title={record.title} right={record.right} sub={record.date} />
                  ))
                )}
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function GoalRow({
  title,
  value,
  percent,
  bar,
}: {
  title: string;
  value: string;
  percent: number;
  bar: string;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex justify-between text-sm">
        <span>{title}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function GoalInput({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-900"
      />
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[130px_1fr_45px] items-center gap-4">
      <span className="truncate text-sm">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold">{value}%</span>
    </div>
  );
}

function ActivityRow({ item }: { item: RecentItem }) {
  const badgeColor = item.type === "퀴즈" ? "bg-indigo-50 text-indigo-600" : item.type === "자료" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";

  return (
    <div className="grid grid-cols-[58px_1fr_90px_55px] items-center border-b border-slate-100 py-3 text-sm last:border-b-0">
      <span className={`rounded-full px-3 py-1 text-center text-xs ${badgeColor}`}>{item.type}</span>
      <span className="truncate px-3">{item.title}</span>
      <strong className="truncate text-right">{item.right}</strong>
      <span className="text-right text-slate-400">{item.date}</span>
    </div>
  );
}

function ListRow({ title, right, sub }: { title: string; right: string; sub: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4 text-sm last:border-b-0">
      <span className="max-w-[260px] truncate">{title}</span>
      <div className="flex gap-5">
        <strong>{right}</strong>
        {sub && <span className="text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">{text}</div>;
}

function LineChart({ data }: { data: { label: string; rate: number }[] }) {
  const width = 900;
  const height = 220;
  const paddingX = 50;
  const paddingY = 30;

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : paddingX + (index * (width - paddingX * 2)) / (data.length - 1);
    const y = height - paddingY - (item.rate / 100) * (height - paddingY * 2);
    return { ...item, x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="h-64 rounded-xl bg-gradient-to-b from-white to-indigo-50 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - paddingY - (value / 100) * (height - paddingY * 2);
          return (
            <g key={value}>
              <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={10} y={y + 4} fontSize="12" fill="#64748b">{value}%</text>
            </g>
          );
        })}

        <polyline fill="none" stroke="#6366f1" strokeWidth="3" points={polyline} />

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#6366f1" />
            <text x={point.x} y={height - 6} textAnchor="middle" fontSize="12" fill="#64748b">{point.label}</text>
          </g>
        ))}

        {points.length > 0 && (
          <g>
            <rect x={points[points.length - 1].x - 24} y={points[points.length - 1].y - 36} width="48" height="26" rx="8" fill="#6366f1" />
            <text x={points[points.length - 1].x} y={points[points.length - 1].y - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">
              {points[points.length - 1].rate}%
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
