// app/(home)/_blocks/BlockShell.tsx
export default function BlockShell({
  title,
  right,
  className,
  titleClassName,
  bodyClassName,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`text-base font-semibold text-slate-900 ${titleClassName ?? ""}`}>{title}</h2>
        {right}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
