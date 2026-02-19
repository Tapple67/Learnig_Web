"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/ui/modal";
import { DeleteSubjectAction } from "./components/del_action";

type ActionState = { ok: boolean; error?: string } | null;

export default function DeleteSubject({
  selectedSubjectId,
}: {
  selectedSubjectId?: string;
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    DeleteSubjectAction,
    null
  );

  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const close = () => {
    if (isPending) return;
    setOpen(false);
  };

  const error = state && !state.ok ? state.error : null;
  const disabled = !selectedSubjectId || isPending;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!selectedSubjectId}
        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        과목 삭제
      </button>

      <Modal
        open={open}
        onClose={close}
        title="과목 삭제"
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
              form="delete-subject-form"
              disabled={disabled}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "삭제 중..." : "삭제"}
            </button>
          </>
        }
      >
        <form id="delete-subject-form" action={formAction} className="space-y-3">
          <input type="hidden" name="subjectId" value={selectedSubjectId ?? ""} />

          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            선택된 과목을 삭제할까요? <br />
            관련 데이터(노트/퀴즈/파일 등)도 함께 삭제될 수 있어요.
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
