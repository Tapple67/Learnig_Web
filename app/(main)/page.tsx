import { getUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Current_Grade from "./_home/CurrentGrade";
import Recent_Activity from "./_home/RecentActivity";

export default async function MainPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/70">
          <p className="text-sm text-slate-500">대시보드</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">학습 홈</h1>
          <p className="mt-2 text-sm text-slate-600">
            현재 학기를 중심으로 학습 흐름을 관리해 보세요.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="hidden lg:col-span-2 lg:block" aria-hidden="true" />

          <div className="lg:col-span-7">
            <Current_Grade />
          </div>

          <div className="lg:col-span-3">
            <Recent_Activity />
          </div>
        </section>
      </div>
    </main>
  );
}
