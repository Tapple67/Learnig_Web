"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PdfViewer from "./PdfViewer";
import Modal from "@/app/components/ui/modal";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
// ✅ fileUrl 제거 (signedUrl은 별도 API로 받음)
type Material = { id: string; week: number; title: string };

export default function RecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ 최초 진입 URL 스냅샷(한 번만)
  const initialRef = useRef({
    gradeId: searchParams.get("gradeId") ?? "",
    subjectId: searchParams.get("subjectId") ?? "",
    materialId: searchParams.get("materialId") ?? "",
    page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
  });

  // ✅ URL 동기화 (상태 -> URL)
  function replaceQuery(next: {
    gradeId?: string;
    subjectId?: string;
    materialId?: string;
    page?: number;
  }) {
    const sp = new URLSearchParams(searchParams.toString());

    const setOrDelete = (k: string, v?: string) => {
      if (v && v.trim()) sp.set(k, v);
      else sp.delete(k);
    };

    const gradeId = next.gradeId ?? sp.get("gradeId") ?? "";
    const subjectId = next.subjectId ?? sp.get("subjectId") ?? "";
    const materialId = next.materialId ?? sp.get("materialId") ?? "";

    setOrDelete("gradeId", gradeId);
    setOrDelete("subjectId", subjectId);
    setOrDelete("materialId", materialId);

    if (typeof next.page === "number") sp.set("page", String(Math.max(1, next.page)));
    else if (!sp.get("page")) sp.set("page", "1");

    router.replace(`?${sp.toString()}`, { scroll: false });
  }

  const [msg, setMsg] = useState("");

  // 토스트
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const showToast = (t: string) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1200);
  };

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState("");

  const activeMaterial = useMemo(
    () => materials.find((m) => m.id === activeMaterialId) ?? null,
    [materials, activeMaterialId]
  );

  const [page, setPage] = useState(1);

  // ✅ signed URL (Supabase private bucket)
  const [signedUrl, setSignedUrl] = useState("");
  const [loadingFileUrl, setLoadingFileUrl] = useState(false);

  async function fetchSignedUrl(materialId: string) {
    setLoadingFileUrl(true);
    setMsg("");
    try {
      const res = await fetch(`/api/materials/file_url?materialId=${materialId}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSignedUrl("");
        setMsg(data?.error ?? `signedUrl 불러오기 실패 (${res.status})`);
        return;
      }

      const url = data?.signedUrl ?? "";
      setSignedUrl(url);
      if (!url) setMsg("signedUrl이 비어있음");
    } finally {
      setLoadingFileUrl(false);
    }
  }

  // ✅ activeMaterialId 바뀌면 signedUrl 발급
  useEffect(() => {
    if (!activeMaterialId) {
      setSignedUrl("");
      return;
    }
    fetchSignedUrl(activeMaterialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMaterialId]);

  // 메모
  const [noteCache, setNoteCache] = useState<Record<string, string>>({});
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // grades
  useEffect(() => {
    (async () => {
      setMsg("");
      const res = await fetch("/api/grades", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(data?.error ?? "학기 불러오기 실패");

      const list: Grade[] = data ?? [];
      setGrades(list);

      const wanted = initialRef.current.gradeId;
      const picked =
        (wanted && list.some((g) => g.id === wanted) && wanted) || list[0]?.id || "";

      setSelectedGradeId(picked);
      replaceQuery({ gradeId: picked, subjectId: "", materialId: "", page: 1 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // subjects
  useEffect(() => {
    if (!selectedGradeId) return;

    (async () => {
      setMsg("");
      const res = await fetch(`/api/subjects?gradeId=${selectedGradeId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(data?.error ?? "과목 불러오기 실패");

      const list: Subject[] = data ?? [];
      setSubjects(list);

      const wanted = initialRef.current.subjectId;
      const picked =
        (wanted && list.some((s) => s.id === wanted) && wanted) || list[0]?.id || "";

      setSelectedSubjectId(picked);

      replaceQuery({
        gradeId: selectedGradeId,
        subjectId: picked,
        materialId: "",
        page: 1,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGradeId]);

  // materials
  useEffect(() => {
    if (!selectedSubjectId) {
      setMaterials([]);
      setActiveMaterialId("");
      setSignedUrl("");
      setPage(1);
      setDirty(false);
      setContent("");
      replaceQuery({ subjectId: "", materialId: "", page: 1 });
      return;
    }

    loadMaterials(selectedSubjectId, initialRef.current.materialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  async function loadMaterials(subjectId: string, wantedMaterialId?: string) {
    setMsg("");
    const res = await fetch(`/api/materials?subjectId=${subjectId}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setMsg(data?.error ?? "자료 불러오기 실패");

    const list: Material[] = data ?? [];
    setMaterials(list);

    const picked =
      (wantedMaterialId && list.some((m) => m.id === wantedMaterialId) && wantedMaterialId) ||
      list[0]?.id ||
      "";

    setActiveMaterialId(picked);

    const p = initialRef.current.page || 1;
    setPage(p);

    setDirty(false);
    setContent("");

    replaceQuery({ subjectId, materialId: picked, page: p });
  }

  async function uploadPdf(file: File) {
    if (!selectedSubjectId) return setMsg("과목을 먼저 선택해줘");
    if (file.type !== "application/pdf") return setMsg("PDF만 업로드 가능해");

    const nextWeek = materials.length === 0 ? 1 : Math.max(...materials.map((m) => m.week)) + 1;

    const title = window.prompt("자료 이름", `${nextWeek}주차 자료`) ?? "";
    const finalTitle = title.trim() || `${nextWeek}주차 자료`;

    const form = new FormData();
    form.append("subjectId", selectedSubjectId);
    form.append("week", String(nextWeek));
    form.append("title", finalTitle);
    form.append("file", file);

    setMsg("");
    const res = await fetch("/api/materials", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data?.error ?? `업로드 실패 (${res.status})`);

    showToast("업로드 완료!");
    await loadMaterials(selectedSubjectId, undefined);
  }

  // ===== 메모 로드/저장 =====
  const currentKey = useMemo(() => {
    if (!activeMaterialId) return "";
    return `${activeMaterialId}:${page}`;
  }, [activeMaterialId, page]);

  useEffect(() => {
    if (!activeMaterialId) return;

    const cached = noteCache[currentKey];
    if (cached !== undefined) {
      setContent(cached);
      setDirty(false);
    } else {
      setContent("");
      setDirty(false);
    }

    (async () => {
      setLoadingNote(true);
      setMsg("");
      try {
        const res = await fetch(`/api/notes?materialId=${activeMaterialId}&page=${page}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return setMsg(data?.error ?? `메모 불러오기 실패 (${res.status})`);

        const serverContent = data?.note?.content ?? "";
        setNoteCache((prev) => ({ ...prev, [currentKey]: serverContent }));
        setContent(serverContent);
        setDirty(false);
      } finally {
        setLoadingNote(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMaterialId, page]);

  async function saveNote() {
    if (!activeMaterialId) return false;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: activeMaterialId, page, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? `저장 실패 (${res.status})`);
        return false;
      }
      setNoteCache((prev) => ({ ...prev, [currentKey]: content }));
      setDirty(false);
      showToast("저장되었습니다");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function requestPageChange(nextPage: number) {
    if (!activeMaterialId) return;

    if (dirty) await saveNote();

    const p = Math.max(1, nextPage);
    setPage(p);
    replaceQuery({ page: p });
  }

  // ===== 퀴즈 생성: 모달 + 로딩 =====
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  async function handleConfirmCreateQuiz() {
    if (!activeMaterialId) return;

    // (선택) 메모 변경사항 저장하고 생성
    if (dirty) await saveNote();

    setConfirmCreateOpen(false);
    setQuizLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/quiz/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: activeMaterialId,
          spec: { mcqCount: 2, tfCount: 1, shortCount: 1 },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 생성 실패");

      showToast("퀴즈 생성 완료!");

      const returnTo = window.location.pathname + window.location.search;
      router.push(`/quiz/take/${data.quizSetId}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "퀴즈 생성 중 오류");
    } finally {
      setQuizLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {toast && (
        <div className="fixed left-1/2 top-4 -translate-x-1/2 rounded-xl border bg-white px-4 py-2 text-sm shadow">
          {toast}
        </div>
      )}

      {/* LEFT */}
      <div className="rounded-xl border">
        <div className="border-b p-3 space-y-2">
          {msg && <div className="text-xs text-red-600">{msg}</div>}

          <select
            className="w-full rounded-lg border p-2 text-sm"
            value={selectedGradeId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedGradeId(id);
              replaceQuery({ gradeId: id, subjectId: "", materialId: "", page: 1 });
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.year}-{g.term}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              className="w-full rounded-lg border p-2 text-sm"
              value={selectedSubjectId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedSubjectId(id);
                replaceQuery({ subjectId: id, materialId: "", page: 1 });
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="rounded-lg border px-3 text-sm hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
              title="PDF 업로드"
            >
              +
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.currentTarget.value = "";
                if (f) uploadPdf(f);
              }}
            />
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="text-sm font-medium">업로드된 자료</div>

          {materials.length === 0 ? (
            <div className="text-sm text-gray-500">아직 업로드된 PDF가 없어.</div>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => {
                const active = activeMaterialId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`w-full rounded-lg border p-3 text-left text-sm cursor-pointer ${
                      active ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setActiveMaterialId(m.id);
                      setSignedUrl(""); // ✅ 잔상 방지
                      setPage(1);
                      setDirty(false);
                      setContent("");
                      replaceQuery({ materialId: m.id, page: 1 });
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveMaterialId(m.id);
                        setSignedUrl("");
                        setPage(1);
                        setDirty(false);
                        setContent("");
                        replaceQuery({ materialId: m.id, page: 1 });
                      }
                    }}
                  >
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.week}주차</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="rounded-xl border p-3 space-y-3">
        {/* 상단 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">수업파일</div>
            <div className="text-sm text-gray-600">Page: {page}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={!activeMaterial || quizLoading}
              onClick={() => setConfirmCreateOpen(true)}
              title="현재 선택된 자료로 퀴즈를 생성합니다"
            >
              {quizLoading ? "생성중..." : "퀴즈 생성"}
            </button>

            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!activeMaterial || page <= 1}
              onClick={() => requestPageChange(page - 1)}
            >
              이전
            </button>

            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!activeMaterial}
              onClick={() => requestPageChange(page + 1)}
            >
              다음
            </button>
          </div>
        </div>

        {/* PDF */}
        <div className="h-[52vh] rounded-lg border overflow-hidden bg-white">
          {!activeMaterial ? (
            <div className="p-4 text-sm text-gray-500">왼쪽에서 PDF를 선택해줘.</div>
          ) : loadingFileUrl ? (
            <div className="p-4 text-sm text-gray-500">파일 URL 준비중...</div>
          ) : !signedUrl ? (
            <div className="p-4 text-sm text-gray-500">PDF를 불러올 수 없어.(signedUrl 없음)</div>
          ) : (
            <PdfViewer fileUrl={signedUrl} page={page} />
          )}
        </div>

        {/* 메모 */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">사용자 기록 (페이지별)</div>
            <button
              type="button"
              onClick={() => saveNote()}
              disabled={!activeMaterial || saving || loadingNote}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? "저장중..." : "저장"}
            </button>
          </div>

          <textarea
            className="h-[160px] w-full resize-none rounded-lg border p-3 text-sm"
            placeholder="현재 페이지에 대한 메모"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
              setNoteCache((prev) => ({ ...prev, [currentKey]: e.target.value }));
            }}
            disabled={!activeMaterial || loadingNote}
          />

          <div className="mt-2 text-xs text-gray-500">
            이전/다음 버튼을 누르면 “PDF 페이지 + 메모”가 같이 바뀝니다.
          </div>
        </div>
      </div>

      {/* ===== 모달: 퀴즈 생성 확인 ===== */}
      <Modal
        open={confirmCreateOpen}
        onClose={() => setConfirmCreateOpen(false)}
        title="퀴즈 생성"
        footer={
          <>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setConfirmCreateOpen(false)}
              disabled={quizLoading}
            >
              취소
            </button>
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleConfirmCreateQuiz}
              disabled={quizLoading || !activeMaterial}
            >
              만들기
            </button>
          </>
        }
      >
        <div className="text-sm text-gray-700">퀴즈를 만드시겠습니까?</div>
      </Modal>

      {/* ===== 로딩 오버레이 ===== */}
      {quizLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-lg">
            <div className="text-sm font-medium">퀴즈 생성 중...</div>
            <div className="mt-2 text-xs text-gray-500">잠시만 기다려주세요</div>
          </div>
        </div>
      )}
    </div>
  );
}