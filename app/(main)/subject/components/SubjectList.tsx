"use client";

type Subject = { id: string; name: string };

export default function Subject_List({
  subjects,
  selectedSubjectId,
  onSelect,
}: {
  subjects: Subject[];
  selectedSubjectId?: string;
  onSelect: (subjectId: string) => void;
}) {
  return (
    <section className="flex min-h-0 h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">과목</h2>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            등록된 과목이 없습니다.
          </div>
        ) : (
          subjects.map((s) => {
            const selected = selectedSubjectId === s.id;

            return (
              <label
                key={s.id}
                className={[
                  "block cursor-pointer rounded-xl border px-3 py-2 transition",
                  "focus-within:ring-2 focus-within:ring-slate-200",
                  selected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="subject"
                  className="hidden"
                  checked={selected}
                  onChange={() => onSelect(s.id)}
                />
                <div className="text-sm font-medium text-slate-900">{s.name}</div>
              </label>
            );
          })
        )}
      </div>
    </section>
  );
}
