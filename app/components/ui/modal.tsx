// app/components/ui/modal.tsx
"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  panelClassName?: string;  
  bodyClassName?: string;    
};

export default function Modal({
  open,
  onClose,
  title,
  footer,
  children,
  panelClassName = "",
  bodyClassName = "",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full rounded-2xl bg-white shadow-xl ${panelClassName || "max-w-lg"}`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-lg font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <div className={`px-5 py-4 ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
