"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/ui/Modal";
import { AddSubjectAction } from "@/app/(main)/subject/hooks/subject_action";

type ActionState = { ok: boolean; error?: string } | null;

export default function AddSubject({ selectedGradeId }: { selectedGradeId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    AddSubjectAction,
    null
  );

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setOpen(false);
      setName("");
      router.refresh();
    }
  }, [state, router]);

  const close = () => {
    if (isPending) return;
    setOpen(false);
    setName("");
  };

  const error = state && !state.ok ? state.error : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        + 과목 추가
      </button>

      <Modal
        open={open}
        onClose={close}
        title="과목 추가"
        footer={
          <>
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="submit"
              form="add-subject-form"
              disabled={isPending || !name.trim()}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "추가 중..." : "추가"}
            </button>
          </>
        }
      >
        <form id="add-subject-form" action={formAction} className="space-y-3">
          <input type="hidden" name="gradeId" value={selectedGradeId ?? ""} />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">과목명</label>
            <input
              ref={inputRef}
              name="name"
              value={name}
              disabled={isPending}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 데이터베이스"
              maxLength={50}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
