"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/ui/Modal";

type GradeOption = {
  id: string;
  year: number;
  term: number;
  isCurrent: boolean;
};

type Props = {
  grades: GradeOption[];
  currentGradeId: string | null;
};

function labelForGrade(grade: GradeOption) {
  return `${grade.year}년 ${grade.term}학기`;
}

export default function CurrentGradeModal({ grades, currentGradeId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(currentGradeId ?? grades[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openModal = () => {
    setError("");
    setSelectedId(currentGradeId ?? grades[0]?.id ?? "");
    setOpen(true);
  };

  const closeModal = () => {
    if (loading) return;
    setOpen(false);
  };

  const applyChange = async () => {
    if (!selectedId) {
      setError("변경할 학기를 선택해 주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/grades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: selectedId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "학기 변경에 실패했습니다.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={grades.length === 0}
        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        현재 학기 변경
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="현재 학기 변경"
        panelClassName="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={applyChange}
              disabled={loading || grades.length === 0}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "변경 중..." : "적용"}
            </button>
          </>
        }
      >
        {grades.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            변경 가능한 학기가 없습니다.
          </p>
        ) : (
          <div className="space-y-2 h-20 sm:h-32 md:h-80 lg:h-128 overflow-y-auto">
            {grades.map((grade) => (
              <label
                key={grade.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-sky-200 hover:bg-sky-50"
              >
                <input
                  type="radio"
                  name="grade"
                  value={grade.id}
                  checked={selectedId === grade.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-4 w-4 accent-slate-900"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{labelForGrade(grade)}</p>
                  <p className="text-xs text-slate-500">
                    {grade.isCurrent ? "현재 선택된 학기" : "변경 가능"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
