"use client";

import { useEffect, useRef, useState } from "react";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string; fileUrl: string };

export default function RecordPage() {
  const [msg, setMsg] = useState("");

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string>("");

  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMaterial = materials.find((m) => m.id === activeMaterialId) ?? null;

  // grades
  useEffect(() => {
    (async () => {
      setMsg("");
      const res = await fetch("/api/grades");
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(data?.error ?? "학기 불러오기 실패");

      setGrades(data ?? []);
      if ((data ?? []).length > 0) setSelectedGradeId((data ?? [])[0].id);
    })();
  }, []);

  // subjects
  useEffect(() => {
    if (!selectedGradeId) return;
    (async () => {
      setMsg("");
      const res = await fetch(`/api/subjects?gradeId=${selectedGradeId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(data?.error ?? "과목 불러오기 실패");

      setSubjects(data ?? []);
      if ((data ?? []).length > 0) setSelectedSubjectId((data ?? [])[0].id);
      else setSelectedSubjectId("");
    })();
  }, [selectedGradeId]);

  // materials
  useEffect(() => {
    if (!selectedSubjectId) {
      setMaterials([]);
      setActiveMaterialId("");
      return;
    }
    loadMaterials(selectedSubjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  async function loadMaterials(subjectId: string) {
    setMsg("");
    const res = await fetch(`/api/materials?subjectId=${subjectId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) return setMsg(data?.error ?? "자료 불러오기 실패");

    const list: Material[] = data ?? [];
    setMaterials(list);

    const firstId = list[0]?.id ?? "";
    setActiveMaterialId(firstId);
    setPage(1);
    setContent("");
  }

  async function uploadPdf(file: File) {
    if (!selectedSubjectId) return setMsg("과목을 먼저 선택해줘");
    if (file.type !== "application/pdf") return setMsg("PDF만 업로드 가능해");

    // 다음 week 계산
    const nextWeek =
      materials.length === 0 ? 1 : Math.max(...materials.map((m) => m.week)) + 1;

    const title = window.prompt("자료 이름(예: 3주차 자료)", `${nextWeek}주차 자료`) ?? "";
    const finalTitle = title.trim() || `${nextWeek}주차 자료`;

    const form = new FormData();
    form.append("subjectId", selectedSubjectId);
    form.append("week", String(nextWeek));
    form.append("title", finalTitle);
    form.append("file", file);

    setMsg("");
    const res = await fetch("/api/materials", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data?.error ?? "업로드 실패");

    setMsg("업로드 완료!");
    await loadMaterials(selectedSubjectId); // ✅ 업로드 후 즉시 반영
  }

  const pdfSrc = activeMaterial ? `${activeMaterial.fileUrl}#page=${page}` : "";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* LEFT */}
      <div className="rounded-xl border">
        <div className="border-b p-3 space-y-2">
          {msg && <div className="text-xs text-gray-600">{msg}</div>}

          <select
            className="w-full rounded-lg border p-2 text-sm"
            value={selectedGradeId}
            onChange={(e) => setSelectedGradeId(e.target.value)}
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
              onChange={(e) => setSelectedSubjectId(e.target.value)}
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
                    setContent("");
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
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">수업파일 page</div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!activeMaterial || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!activeMaterial}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        </div>

        <div className="h-[55vh] rounded-lg border">
          {!activeMaterial ? (
            <div className="p-4 text-sm text-gray-500">왼쪽에서 PDF를 선택해줘.</div>
          ) : (
            <iframe title="pdf" src={pdfSrc} className="h-full w-full" />
          )}
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">사용자 기록</div>
          <textarea
            className="h-[160px] w-full resize-none rounded-lg border p-3 text-sm"
            placeholder="이 페이지에 대한 메모"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!activeMaterial}
          />
          <div className="mt-2 text-xs text-gray-500">
            메모 저장 연결은 다음 단계에서(지금은 업로드/뷰어/리스트 정상화 먼저).
          </div>
        </div>
      </div>
    </div>
  );
}