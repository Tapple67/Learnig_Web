"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


type Subject = {
    id: string;
    name: string;
}

type props = {
    gradeId?: string;
    selectedSubjectId?: string;
    onSelect: (SubjectId: string) => void;
};

export default function Subject_List({gradeId,selectedSubjectId,onSelect}: props){
const [subjects, setsubjects] = useState<Subject[]>([]); 


//2.과목 목록 불러오기
    useEffect(() => {
  if (!gradeId) return;

  fetch(`/api/subjects?gradeId=${gradeId}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data: Subject[]) => setsubjects(data));
}, [gradeId]);
    

    
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