"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PdfViewer from "./PdfViewer";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string; fileUrl: string };

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
      const res = await fetch("/api/grades");
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
      const res = await fetch(`/api/subjects?gradeId=${selectedGradeId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(data?.error ?? "과목 불러오기 실패");

      const list: Subject[] = data ?? [];
      setSubjects(list);

      const wanted = initialRef.current.subjectId;
      const picked =
        (wanted && list.some((s) => s.id === wanted) && wanted) || list[0]?.id || "";

      setSelectedSubjectId(picked);

      // 학기 바뀌면 자료/페이지는 초기화하는 게 안전
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
    const res = await fetch(`/api/materials?subjectId=${subjectId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) return setMsg(data?.error ?? "자료 불러오기 실패");

    const list: Material[] = data ?? [];
    setMaterials(list);

    const picked =
      (wantedMaterialId && list.some((m) => m.id === wantedMaterialId) && wantedMaterialId) ||
      list[0]?.id ||
      "";

    setActiveMaterialId(picked);

    // URL에 page 있으면 그거 우선, 없으면 1
    const p = initialRef.current.page || 1;
    setPage(p);

    setDirty(false);
    setContent("");

    replaceQuery({ subjectId, materialId: picked, page: p });
  }

  async function uploadPdf(file: File) {
    if (!selectedSubjectId) return setMsg("과목을 먼저 선택해줘");
    if (file.type !== "application/pdf") return setMsg("PDF만 업로드 가능해");

    const nextWeek =
      materials.length === 0 ? 1 : Math.max(...materials.map((m) => m.week)) + 1;

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
    // 업로드 후 목록 재로드: 첫 자료로 자동 선택될 수 있으니 초기Ref는 쓰지 말고 현재 기준
    await loadMaterials(selectedSubjectId, undefined);
  }

  // ===== 메모 로드/저장 =====
  const currentKey = useMemo(() => {
    if (!activeMaterialId) return "";
    return `${activeMaterialId}:${page}`;
  }, [activeMaterialId, page]);

  useEffect(() => {
    if (!activeMaterialId) return;

    // 캐시 먼저
    const cached = noteCache[currentKey];
    if (cached !== undefined) {
      setContent(cached);
      setDirty(false);
    } else {
      setContent("");
      setDirty(false);
    }

    // 서버에서 최신
    (async () => {
      setLoadingNote(true);
      setMsg("");
      try {
        const res = await fetch(`/api/notes?materialId=${activeMaterialId}&page=${page}`);
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

  // ✅ “이전/다음” 눌렀을 때: (1) 현재 메모 저장 → (2) 페이지 이동 → (3) 새 페이지 메모 자동 로드
  async function requestPageChange(nextPage: number) {
    if (!activeMaterialId) return;

    // 현재 페이지 메모 저장
    if (dirty) await saveNote();

    const p = Math.max(1, nextPage);
    setPage(p);
    replaceQuery({ page: p });
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

              // 아래 subjects/materials 로딩 흐름에서 정리되긴 하는데
              // UX상 URL도 바로 정리해두면 좋아
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
            materials.map((m) => {
              const active = activeMaterialId === m.id;
              return (
                <button
                  key={m.id}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    active ? "border-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    setActiveMaterialId(m.id);
                    setPage(1);
                    setDirty(false);
                    setContent("");
                    replaceQuery({ materialId: m.id, page: 1 });
                  }}
                >
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-gray-500">{m.week}주차</div>
                </button>
              );
            })
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

        {/* PDF (한 장씩만) */}
        <div className="h-[52vh] rounded-lg border overflow-hidden bg-white">
          {!activeMaterial ? (
            <div className="p-4 text-sm text-gray-500">왼쪽에서 PDF를 선택해줘.</div>
          ) : (
            <PdfViewer fileUrl={activeMaterial.fileUrl} page={page} />
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
    </div>
  );
}