"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSubject({
  selectedGradeId,
}: {
  selectedGradeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    if (loading) return; // 로딩 중엔 닫기 방지
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
        body: JSON.stringify({
          name: trimmed,
          gradeId: selectedGradeId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "과목 생성 실패");
        return;
      }


      close();
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
      >
        + 과목 추가
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            과목명
          </label>
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
              if (e.key === "Escape") close();
            }}
            placeholder="예: 데이터베이스"
            maxLength={50}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 disabled:bg-gray-100"
          />
        </div>

        <div className="flex gap-2 sm:pt-5">
          <button
            type="button"
            onClick={submit}
            disabled={loading || !name.trim()}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "추가 중..." : "추가"}
          </button>

          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            취소
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Enter로 추가 · Esc로 취소
      </div>
    </div>
  );
}
