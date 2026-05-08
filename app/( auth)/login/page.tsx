"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error ?? "로그인에 실패했습니다. 다시 시도해 주세요.");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-10 text-slate-900">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-sky-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-sm lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-sky-700">
              LEARNING WEB
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-slate-900">
              On Re:Learn
              <br />
            </h1>
            <h2 className="text-2xl font-semibold leading-tight text-slate-900">
              Only Learn
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              퀴즈 풀이, 자료 관리, 학습 기록을 한 화면에서 이어서 진행하세요.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs tracking-wide text-slate-500">파일관리</p>
              <p className="mt-1 font-medium text-slate-800">학습 자료를 한곳에서 정리</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs tracking-wide text-slate-500">학습기록</p>
              <p className="mt-1 font-medium text-slate-800">최근 학습 흐름을 한눈에 확인</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs tracking-wide text-slate-500">퀴즈 풀이</p>
              <p className="mt-1 font-medium text-slate-800">문제 풀이와 결과를 즉시 반영</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs tracking-wide text-slate-500">학습통계</p>
              <p className="mt-1 font-medium text-slate-800">성과 지표로 약점 구간 파악</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8">
            <div className="mb-8">
              <p className="text-sm text-slate-500">다시 만나서 반가워요</p>
              <h2 className="mt-1 text-3xl font-semibold text-slate-900">로그인</h2>
            </div>

            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  아이디
                </label>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="아이디를 입력해 주세요"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해 주세요"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              아직 계정이 없나요?{" "}
              <Link className="font-medium text-sky-700 hover:text-sky-600" href="/register">
                회원가입
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
