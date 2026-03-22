"use client";

type Grade = { id: string; year: number; term: number | null };

export default function Grade_List({
  grades,
  selectedGradeId,
  onSelect,
}: {
  grades: Grade[];
  selectedGradeId?: string;
  onSelect: (gradeId: string) => void;
}) {
  return (
    <section className="flex min-h-0 h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">학기</h2>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
        {grades.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            등록된 학기가 없습니다.
          </div>
        ) : (
          grades.map((g) => {
            const selected = selectedGradeId === g.id;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.id)}
                className={[
                  "block w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                  "focus:outline-none focus:ring-2 focus:ring-slate-200",
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {g.year}학년 {g.term}학기
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
