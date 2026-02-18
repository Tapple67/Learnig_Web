"use client";

import { useRouter } from "next/navigation";
import Grade_List from "./grade_list";
import Subject_List from "./subject_list";
import AddSubject from "./addsubject";


type Grade = { id: string; year: number; term: number | null };
type Subject = { id: string; name: string; gradeId: string };

export default function Combi({
  grades,
  subjects,
  selectedGradeId,
  selectedSubjectId,
}: {
  grades: Grade[];
  subjects: Subject[];
  selectedGradeId?: string;
  selectedSubjectId?: string;
}) {
  const router = useRouter();

  const setGrade = (gradeId: string) => {
    // 학기 바꾸면 subject 선택은 초기화
    router.push(`/subject?gradeId=${gradeId}`);
  };

  const setSubject = (subjectId: string) => {
    if (!selectedGradeId) return;
    router.push(`/subject?gradeId=${selectedGradeId}&subjectId=${subjectId}`);
  };

  return (
    <div className="flex gap-6">
      <Grade_List
        grades={grades}
        selectedGradeId={selectedGradeId}
        onSelect={setGrade}
      />

      <Subject_List
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelect={setSubject}
      />
      
      <AddSubject selectedGradeId={selectedGradeId} />


    </div>
  );
}
