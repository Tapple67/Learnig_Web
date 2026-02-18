"use client";

import { useEffect, useRef, useState } from "react";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string; fileUrl: string };

export default function RecordPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);

  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 학기 불러오기
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/grades");
      const data = await res.json();
      setGrades(data);
      if (data.length > 0) setSelectedGradeId(data[0].id);
    })();
  }, []);

  // 과목 불러오기
  useEffect(() => {
    if (!selectedGradeId) return;
    (async () => {
      const res = await fetch(`/api/subjects?gradeId=${selectedGradeId}`);
      const data = await res.json();
      setSubjects(data);
      if (data.length > 0) setSelectedSubjectId(data[0].id);
    })();
  }, [selectedGradeId]);

  // 자료 불러오기
  useEffect(() => {
    if (!selectedSubjectId) return;
    loadMaterials();
  }, [selectedSubjectId]);

  async function loadMaterials() {
    const res = await fetch(`/api/materials?subjectId=${selectedSubjectId}`);
    const data = await res.json();
    setMaterials(data);
    if (data.length > 0) setActiveMaterial(data[0]);
  }

  // PDF 업로드
  async function uploadPdf(file: File) {
    const form = new FormData();
    form.append("subjectId", selectedSubjectId);
    form.append("week", String(materials.length + 1));
    form.append("title", `${materials.length + 1}주차`);
    form.append("file", file);

    const res = await fetch("/api/materials", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) return setMsg(data.error);

    setMsg("업로드 완료!");
    loadMaterials();
  }

  return (
    <div className="grid grid-cols-[320px_1fr] gap-4 h-[80vh]">
      {/* LEFT */}
      <div className="border rounded-xl flex flex-col">

        <div className="p-3 border-b">
          <select
            value={selectedGradeId}
            onChange={(e) => setSelectedGradeId(e.target.value)}
          >
            {grades.map(g => (
              <option key={g.id} value={g.id}>
                {g.year}-{g.term}
              </option>
            ))}
          </select>

          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button onClick={() => fileInputRef.current?.click()}>+ PDF</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPdf(f);
            }}
          />
        </div>

        <div className="flex-1 overflow-auto p-3">
          {materials.map(m => (
            <div
              key={m.id}
              className="border p-2 cursor-pointer"
              onClick={() => setActiveMaterial(m)}
            >
              {m.title}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="border rounded-xl p-3 flex flex-col">

        <div className="flex-1">
          {activeMaterial ? (
            <iframe
              src={`${activeMaterial.fileUrl}#page=${page}`}
              className="w-full h-full border"
            />
          ) : (
            <div>PDF 선택</div>
          )}
        </div>

        <div className="mt-4">
          <textarea
            className="w-full h-32 border"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="해당 페이지 메모"
          />
        </div>
      </div>
    </div>
  );
}