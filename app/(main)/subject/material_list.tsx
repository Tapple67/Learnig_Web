"use client";

type Material = { id: string; week: number; title: string };

export default function Material_List({
  materials,
  selectedSubjectId,
  onOpenMaterial,
}: {
  materials: Material[];
  selectedSubjectId?: string;
  onOpenMaterial: (materialId: string) => void;
}) {
  return (
    <section className="flex min-h-0 h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">파일</h2>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
        {!selectedSubjectId && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            과목을 선택하세요.
          </div>
        )}

        {selectedSubjectId && materials.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            등록된 파일이 없습니다.
          </div>
        )}

        {selectedSubjectId &&
          materials.length > 0 &&
          materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenMaterial(m.id)}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-900">{m.title}</div>
              <div className="mt-1 text-xs text-slate-500">{m.week}주차</div>
            </button>
          ))}
      </div>
    </section>
  );
}
