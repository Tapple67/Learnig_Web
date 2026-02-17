"use client";

import { useEffect, useRef, useState } from "react";

type Subject = { id: string; name: string; gradeId?: string };

export default function AddSubject({
  selectedGradeId,
  onCreated,
}: {
  selectedGradeId?: string;
  onCreated: (subject: Subject) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setName("");
    setError(null);
  };

  const submit = async () => {
    if (!selectedGradeId) {
      setError("학기를 먼저 선택해 주세요.");
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, gradeId: selectedGradeId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "과목 생성 실패");
        return;
      }

      onCreated(data.subject);
      close();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
      >
        + 과목 추가
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-label="닫기"
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">과목 추가</h2>
              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-sm text-gray-600">과목명</label>
              <input
                ref={inputRef}
                value={name}
                disabled={loading}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="예: 데이터베이스"
                maxLength={50}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 disabled:bg-gray-100"
              />
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !name.trim()}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "추가 중..." : "추가"}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">ESC로 닫기</p>
          </div>
        </div>
      )}
    </>
  );
}
