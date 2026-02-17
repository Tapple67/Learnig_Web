"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Grade = {
    id: string;
    year: number;
    term: number;
    isCurrent: boolean;
}

type props = {
    selectedGradeId?: string;
    onSelect:(gradeId:string) => void;
};


export default function Grade_List({selectedGradeId, onSelect}: props){
    
    const [grades, setGrades] = useState<Grade[]>([]);

    //1. 학기 목록 불러오기
    useEffect(() => {
    fetch("/api/grades")
    .then((res) => res.json())
    .then((data : Grade[]) => {
        setGrades(data);
        if (!selectedGradeId && data[0]?.id) onSelect(data[0].id); // 최소 첫학기 선택
    });
    }, []);


    

    return (
        <div>
        {grades.map((grade) => {
        const selected = selectedGradeId === grade.id;
        
        return (
            <label
                key={grade.id}
                className={`block cursor-pointer rounded border p-3 mb-2
                    ${selected ? "border-blue-500 bg-blue-50 font-semibold" : "border-gray-300"}
                `}
            >
            <input
                type="radio"
                name="grade"
                className="hidden"
                checked={selected}
                onChange={() => onSelect(grade.id)}
            />
            {grade.year}학년 {grade.term}학기
            </label>
            );
    })}

    </div>
    );

}

