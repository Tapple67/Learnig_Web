"use client";

import MoreActionsMenu from "./more-actions-menu";
import type { Grade, Subject } from "../types";

type SubjectPanelProps = {
  grades: Grade[];
  subjects: Subject[];
  selectedGradeId?: string;
  selectedSubjectId?: string;
  onSelectGrade: (gradeId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onOpenSubjectStats: (subjectId: string) => void;
  onAddSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
};

export default function SubjectPanel(props: SubjectPanelProps) {
  const {
    grades,
    subjects,
    selectedGradeId,
    selectedSubjectId,
    onSelectGrade,
    onSelectSubject,
    onOpenSubjectStats,
    onAddSubject,
    onEditSubject,
    onDeleteSubject,
  } = props;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">학기</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {grades.map((g) => {
          const selected = g.id === selectedGradeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGrade(g.id)}
              className={`rounded-lg border px-2 py-2 text-xs transition ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {g.year}-{g.term}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">과목</h3>
        <button
          type="button"
          onClick={onAddSubject}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
        >
          추가
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto pb-1">
        {subjects.map((s) => {
          const selected = s.id === selectedSubjectId;
          return (
            <div
              key={s.id}
              className={`group relative rounded-lg border px-3 py-3 ${
                selected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                className="w-[calc(100%-2rem)] text-left text-sm font-medium"
                onClick={() => onSelectSubject(s.id)}
              >
                {s.name}
              </button>
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs opacity-0 transition hover:bg-slate-100 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSubjectStats(s.id);
                  }}
                >
                  통계
                </button>
                <MoreActionsMenu
                  items={[
                    { key: "edit", label: "수정", onClick: () => onEditSubject(s) },
                    { key: "delete", label: "삭제", tone: "danger", onClick: () => onDeleteSubject(s) },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
