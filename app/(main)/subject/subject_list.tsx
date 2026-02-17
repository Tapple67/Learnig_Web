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
    <div>
      {subjects.map((s) => {
        const selected = selectedSubjectId === s.id;

        return (
          <label
            key={s.id}
            className={`block cursor-pointer rounded border p-3 mb-2
              ${selected ? "border-green-500 bg-green-50 font-semibold" : "border-gray-300"}
            `}
          >
            <input
              type="radio"
              name="subject"
              className="hidden"
              checked={selected}
              onChange={() => onSelect(s.id)}
            />
            {s.name}
          </label>
        );
      })}
    </div>
  );
}
