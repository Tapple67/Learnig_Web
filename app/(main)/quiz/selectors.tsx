"use client";

type Grade = { id: string; year: number; term: number; isCurrent: boolean };
type Subject = { id: string; name: string; isCurrent: boolean; gradeId: string };
type Material = { id: string; week: number; title: string; createdAt: Date; subjectId: string };

export default function Selectors(props: {
  grades: Grade[];
  subjects: Subject[];
  materials: Material[];
  selected: { gradeId?: string; subjectId?: string; materialId?: string };
  onSelectGrade: (gradeId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onSelectMaterial: (materialId: string) => void;
}) {
  const { grades, subjects, materials, selected } = props;
  const orderedGrades = [...grades].sort((a, b) => {
    if (a.term !== b.term) return a.term - b.term;
    return a.year - b.year;
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">학기</h2>
        <div className="mt-2">
          {grades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              학기가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {orderedGrades.map((g) => {
                const active = selected.gradeId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => props.onSelectGrade(g.id)}
                    className={[
                      "block w-full rounded-xl border px-2 py-2 text-center text-xs font-medium transition sm:text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-slate-200",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {g.year}-{g.term}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">과목</h2>
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
          {!selected.gradeId ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              학기를 선택하세요
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              과목이 없습니다.
            </div>
          ) : (
            subjects.map((s) => {
              const active = selected.subjectId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => props.onSelectSubject(s.id)}
                  className={[
                    "block w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    "focus:outline-none focus:ring-2 focus:ring-slate-200",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {s.name}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">파일</h2>
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
          {!selected.subjectId ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              과목을 선택하세요.
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              파일이 없습니다.
            </div>
          ) : (
            materials.map((m) => {
              const active = selected.materialId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => props.onSelectMaterial(m.id)}
                  className={[
                    "block w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    "focus:outline-none focus:ring-2 focus:ring-slate-200",
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  title={m.title}
                >
                  <div className="font-medium">{m.title}</div>
                  <div className="mt-1 text-xs opacity-80">{m.week}주차</div>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
