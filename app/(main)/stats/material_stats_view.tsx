"use client";

import type { MaterialStatsResponse } from "@/lib/stats/types";

function pct(n: number) {
  return `${Math.max(0, Math.min(100, n))}%`;
}

function MiniCard(props: { label: string; value: string | number; tone?: "blue" | "slate" }) {
  const tone = props.tone ?? "slate";
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/80 text-blue-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{props.label}</div>
      <div className="mt-1 text-xl font-semibold leading-none">{props.value}</div>
    </div>
  );
}

function ProgressBar(props: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
        style={{ width: pct(props.value) }}
      />
    </div>
  );
}

export default function MaterialStatsView(props: { data: MaterialStatsResponse }) {
  const { data } = props;
  const recentTrend = [...data.trend].reverse();
  const weakTopics = [...data.weakTopics]
    .sort((a, b) => {
      const aWrongRate = a.total > 0 ? a.wrong / a.total : 0;
      const bWrongRate = b.total > 0 ? b.wrong / b.total : 0;
      if (bWrongRate !== aWrongRate) return bWrongRate - aWrongRate;
      return b.wrong - a.wrong;
    })
    .slice(0, 5);
  const recommendations = data.recommendations.slice(0, 3);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
      <aside className="min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 text-white">
          <div className="text-xs text-slate-200">
            {data.material.grade.year}-{data.material.grade.term} · {data.material.subjectName}
          </div>
          <div className="mt-2 text-lg font-semibold leading-tight">
            {data.material.week}주차 · {data.material.title}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs text-slate-300">전체 정답률</div>
              <div className="text-3xl font-bold leading-none">{data.summary.accuracy}%</div>
            </div>
            <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium">
              {data.understanding.label}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniCard label="시도" value={data.summary.totalAttempts} />
          <MiniCard label="최근 점수" value={data.summary.latestScore} />
          <MiniCard label="평균 점수" value={data.summary.averageScore} />
          <MiniCard label="정답/전체" value={`${data.summary.totalCorrect}/${data.summary.totalQuestions}`} tone="blue" />
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {data.understanding.message}
        </div>
      </aside>

      <section className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-12">
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1 xl:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">문제 유형별 정확도</div>
            <div className="mt-4 space-y-4">
              {[
                { key: "mcq", label: "객관식", stat: data.typeStats.mcq },
                { key: "tf", label: "OX", stat: data.typeStats.tf },
                { key: "short", label: "서술형", stat: data.typeStats.short },
              ].map((row) => (
                <div key={row.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div className="font-medium text-slate-800">{row.label}</div>
                    <div className="text-slate-600">
                      {row.stat.correct}/{row.stat.total} · {row.stat.accuracy}%
                    </div>
                  </div>
                  <ProgressBar value={row.stat.accuracy} />
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">최근 풀이 기록</div>
            {recentTrend.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">제출 기록이 없습니다.</div>
            ) : (
              <div className="mt-3 grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {recentTrend.map((t, idx) => (
                  <div key={t.attemptId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs text-slate-500">최근 시도 {data.trend.length - idx}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {t.score}/{t.maxScore} ({t.accuracy}점)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto pr-1 xl:col-span-6">
          <div className="min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">약한 주제</div>
            {weakTopics.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">반복 오답 주제가 아직 없습니다.</div>
            ) : (
              <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
                {weakTopics.map((topic) => (
                  <div key={topic.topic} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="truncate font-medium text-slate-900">{topic.topic}</div>
                      <div className="font-semibold text-slate-700">{topic.accuracy}%</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      정답 {topic.correct} · 오답 {topic.wrong} · 총 {topic.total}
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={topic.accuracy} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">학습 추천</div>
            {recommendations.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">추천할 내용이 없습니다.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {recommendations.map((msg, idx) => (
                  <div
                    key={`${msg}-${idx}`}
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900"
                  >
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
