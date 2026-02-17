"use client";

import { useState } from "react";
import Grade_List from "./grade_list";
import Subject_List from "./subject_list";
import AddSubject from "./addsubject";

export default function Combi() {
  const [selectedGradeId, setSelectedGradeId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

  return (
    <div className="flex gap-6">
      <Grade_List
        selectedGradeId={selectedGradeId}
        onSelect={(gradeId) => {
            setSelectedGradeId(gradeId);
            setSelectedSubjectId(undefined);
        }
        }
      />

      <Subject_List 
        gradeId={selectedGradeId}
        selectedSubjectId={selectedSubjectId}
        onSelect={setSelectedSubjectId} 
      />

       <AddSubject selectedGradeId={selectedGradeId}
      />
    </div>


  );
}
