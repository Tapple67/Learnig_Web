import Link from "next/link";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      <div className="p-3 bg-gray-100 flex gap-4">
        <Link href="/">홈</Link>
        <Link href="/subject">과목</Link>
        <Link href="/record">기록</Link>
        <Link href="/quiz">퀴즈</Link>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}