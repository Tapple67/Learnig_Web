// app/quiz/selectors.tsx
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

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl p-4">
        {/* ✅ 모바일에서는 세로, md 이상에서는 3컬럼 가로 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 학기 */}
          <section>
            <div className="text-xs font-semibold text-gray-600 mb-2">학기</div>
            <div className="flex flex-wrap gap-2">
              {grades.map((g) => {
                const active = selected.gradeId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => props.onSelectGrade(g.id)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      active ? "border-blue-600 bg-blue-50" : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {g.year}-{g.term}
                  </button>
                );
              })}
              {grades.length === 0 && <div className="text-sm text-gray-500">학기가 없습니다.</div>}
            </div>
          </section>

          {/* 과목 */}
          <section>
            <div className="text-xs font-semibold text-gray-600 mb-2">과목</div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const active = selected.subjectId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => props.onSelectSubject(s.id)}
                    disabled={!selected.gradeId}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      !selected.gradeId ? "opacity-50 cursor-not-allowed" : "",
                      active ? "border-blue-600 bg-blue-50" : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {s.name}
                  </button>
                );
              })}
              {!selected.gradeId && <div className="text-sm text-gray-500">학기를 먼저 선택하세요.</div>}
              {selected.gradeId && subjects.length === 0 && (
                <div className="text-sm text-gray-500">과목이 없습니다.</div>
              )}
            </div>
          </section>

          {/* 파일 */}
          <section>
            <div className="text-xs font-semibold text-gray-600 mb-2">파일</div>
            <div className="flex flex-wrap gap-2">
              {materials.map((m) => {
                const active = selected.materialId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => props.onSelectMaterial(m.id)}
                    disabled={!selected.subjectId}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      !selected.subjectId ? "opacity-50 cursor-not-allowed" : "",
                      active ? "border-blue-600 bg-blue-50" : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                    title={m.title}
                  >
                    {m.week}주차
                  </button>
                );
              })}
              {!selected.subjectId && <div className="text-sm text-gray-500">과목을 먼저 선택하세요.</div>}
              {selected.subjectId && materials.length === 0 && (
                <div className="text-sm text-gray-500">파일이 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}