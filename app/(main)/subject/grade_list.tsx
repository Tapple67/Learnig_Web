"use client";

type Grade = { id: string; year: number; term:number | null };

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
    <div>
      {grades.map((g) => {
        const selected = selectedGradeId === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className={`block w-full rounded border p-3 mb-2 text-left
              ${selected ? "border-blue-500 bg-blue-50 font-semibold" : "border-gray-300"}
            `}
          >
            {g.year} - {g.term}
          </button>
        );
      })}
    </div>
  );
}
