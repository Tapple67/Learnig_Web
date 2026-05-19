"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MenuItem = {
  key: string;
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
};

export default function MoreActionsMenu({
  items,
  className,
}: {
  items: MenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const hasDanger = useMemo(() => items.some((it) => it.tone === "danger"), [items]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (boxRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 128;
    const top = rect.bottom + 6;
    const left = Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth));
    setPos({ top, left });
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={className ?? "rounded-md px-2 py-1 text-slate-500 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100"}
      >
        ⋯
      </button>

      {open && (
        <div
          ref={boxRef}
          className={`fixed z-[120] w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl ${hasDanger ? "" : ""}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100 ${
                it.tone === "danger" ? "text-rose-600 hover:bg-rose-50" : "text-slate-700"
              }`}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
