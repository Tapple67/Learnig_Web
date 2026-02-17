"use client";

import { useEffect, useState } from "react";
import Grade_List from "./grade_list";
import Subject_List from "./subject_list";
import AddSubject from "./addsubject";

type Grade = { id: string; year: number; term: number }; 
type Subject = { id: string; name: string; gradeId?: string };

export default function Combi() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

  //학기 목록 로딩(처음 한 번)
  useEffect(() => {
    fetch("/api/grades", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setGrades(Array.isArray(data) ? data : []));
  }, []);

  //선택된 학기 바뀌면 과목 목록 로딩
  useEffect(() => {
    if (!selectedGradeId) {
      setSubjects([]);
      setSelectedSubjectId(undefined);
      return;
    }

    fetch(`/api/subjects?gradeId=${selectedGradeId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []));
  }, [selectedGradeId]);

  return (
    <div className="flex gap-6">
      <Grade_List
        grades={grades}
        selectedGradeId={selectedGradeId}
        onSelect={(gradeId) => {
          setSelectedGradeId(gradeId);
          setSelectedSubjectId(undefined);
        }}
      />

      <Subject_List
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelect={setSelectedSubjectId}
      />

      <AddSubject
        selectedGradeId={selectedGradeId}
        onCreated={(newSubject) => {
          setSubjects((prev) =>
            prev.some((p) => p.id === newSubject.id) ? prev : [newSubject, ...prev]
          );
        }}
      />
    </div>
  );
}
