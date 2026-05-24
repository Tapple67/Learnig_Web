"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/ui/Modal";
import MaterialStatsModal from "@/app/(main)/stats/components/MaterialStatsModal";
import SubjectPanel from "./SubjectPanel";
import MoreActionsMenu from "./MoreActionsMenu";
import { useSubjectPanelState } from "../hooks/use_subject_panel_state";
import { formatDaysAgo } from "../utils/date";
import type {
  ContentFilter,
  Grade,
  Material,
  QuizSetCard,
  SelectedMaterial,
  SortOrder,
  Subject,
} from "../types";
type MobilePanel = "subject" | "file" | "content";

function toKoreanQuizStatus(status?: string | null) {
  if (status === "IN_PROGRESS") return "진행 중";
  if (status === "SUBMITTED") return "제출 완료";
  if (status === "GRADED") return "채점 완료";
  return "생성됨";
}

export default function Combi({
  grades,
  subjects,
  materials,
  selectedGradeId,
  selectedSubjectId,
  selectedMaterialId,
  selectedMaterial,
  quizSets,
}: {
  grades: Grade[];
  subjects: Subject[];
  materials: Material[];
  selectedGradeId?: string;
  selectedSubjectId?: string;
  selectedMaterialId?: string;
  selectedMaterial: SelectedMaterial | null;
  quizSets: QuizSetCard[];
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("subject");
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsMaterialId, setStatsMaterialId] = useState("");
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");
  const [leftPct, setLeftPct] = useState(33);
  const [midPct, setMidPct] = useState(34);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const [editMaterialOpen, setEditMaterialOpen] = useState(false);
  const [deleteMaterialOpen, setDeleteMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editMaterialTitle, setEditMaterialTitle] = useState("");
  const [editMaterialWeek, setEditMaterialWeek] = useState("1");
  const [editQuizOpen, setEditQuizOpen] = useState(false);
  const [deleteQuizOpen, setDeleteQuizOpen] = useState(false);
  const [editingQuizSetId, setEditingQuizSetId] = useState("");
  const [editQuizTitle, setEditQuizTitle] = useState("");

  const subjectState = useSubjectPanelState();

  const summaryItem = selectedMaterial?.summary
    ? {
        id: selectedMaterial.summary.id,
        type: "summary" as const,
        title: `${selectedMaterial.title} 요약본`,
        createdAt: selectedMaterial.summary.updatedAt,
        meta: `${selectedMaterial.summary.provider ?? "AI"} ${selectedMaterial.summary.model ?? ""}`.trim(),
      }
    : null;

  const mergedContent = useMemo(() => {
    const quizItems = quizSets.map((q) => ({
      id: q.id,
      type: "quiz" as const,
      title: q.title ?? "퀴즈",
      createdAt: q.createdAt,
      meta: toKoreanQuizStatus(q.latestAttempt?.status),
      latestAttempt: q.latestAttempt,
    }));

    const all = [...(summaryItem ? [summaryItem] : []), ...quizItems];
    const filtered = all.filter((it) => (filter === "all" ? true : it.type === filter));

    filtered.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "latest" ? db - da : da - db;
    });

    return filtered;
  }, [quizSets, summaryItem, filter, sortOrder]);

  function pushWith(next: { gradeId?: string; subjectId?: string; materialId?: string }) {
    const p = new URLSearchParams();
    if (next.gradeId) p.set("gradeId", next.gradeId);
    if (next.subjectId) p.set("subjectId", next.subjectId);
    if (next.materialId) p.set("materialId", next.materialId);
    router.push(`/subject?${p.toString()}`);
  }

  const subjectReturnTo = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedGradeId) p.set("gradeId", selectedGradeId);
    if (selectedSubjectId) p.set("subjectId", selectedSubjectId);
    if (selectedMaterialId) p.set("materialId", selectedMaterialId);
    const qs = p.toString();
    return qs ? `/subject?${qs}` : "/subject";
  }, [selectedGradeId, selectedSubjectId, selectedMaterialId]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const box = layoutRef.current?.getBoundingClientRect();
      if (!box) return;

      const xPct = ((e.clientX - box.left) / box.width) * 100;
      const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

      if (dragging === "left") {
        const nextLeft = clamp(xPct, 20, 100 - midPct - 20);
        setLeftPct(nextLeft);
      } else {
        const rightBoundary = clamp(xPct, leftPct + 20, 80);
        setMidPct(rightBoundary - leftPct);
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, leftPct, midPct]);

  async function uploadMaterial(file: File | null) {
    if (!file || !selectedSubjectId || busy) return;
    if (file.type !== "application/pdf") {
      window.alert("PDF 파일만 업로드 가능합니다.");
      return;
    }

    const nextWeek = materials.length ? Math.max(...materials.map((m) => m.week)) + 1 : 1;
    const title = (window.prompt("파일 제목", `${nextWeek}주차 자료`) ?? "").trim() || `${nextWeek}주차 자료`;
    const weekInput = window.prompt("주차", String(nextWeek)) ?? String(nextWeek);
    const week = Math.max(1, Number(weekInput) || nextWeek);

    setBusy(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("subjectId", selectedSubjectId);
      form.append("week", String(week));
      form.append("title", title);
      form.append("file", file);

      const res = await fetch("/api/materials", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "파일 업로드 실패");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "파일 업로드 실패");
    } finally {
      setBusy(false);
    }
  }

  async function createSubject() {
    if (!selectedGradeId || !subjectState.newName.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: selectedGradeId, name: subjectState.newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "과목 추가 실패");
      subjectState.setAddOpen(false);
      subjectState.setNewName("");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "과목 추가 실패");
    } finally {
      setBusy(false);
    }
  }

  async function updateSubject() {
    if (!subjectState.selectedSubject || !subjectState.editName.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectState.selectedSubject.id,
          name: subjectState.editName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "과목 수정 실패");
      subjectState.setEditOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "과목 수정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject() {
    if (!subjectState.selectedSubject || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: subjectState.selectedSubject.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "과목 삭제 실패");
      subjectState.setDeleteOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "과목 삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  function openMaterialEdit(material: Material) {
    setEditingMaterial(material);
    setEditMaterialTitle(material.title);
    setEditMaterialWeek(String(material.week));
    setEditMaterialOpen(true);
  }

  function openMaterialDelete(material: Material) {
    setEditingMaterial(material);
    setDeleteMaterialOpen(true);
  }

  async function updateMaterial() {
    if (!editingMaterial || !editMaterialTitle.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editMaterialTitle.trim(), week: Math.max(1, Number(editMaterialWeek) || 1) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "파일 수정 실패");
      setEditMaterialOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "파일 수정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMaterial() {
    if (!editingMaterial || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/materials/${editingMaterial.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "파일 삭제 실패");
      setDeleteMaterialOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "파일 삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function createSummary() {
    if (!selectedMaterialId || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/summary/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: selectedMaterialId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "요약 생성 실패");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "요약 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function createQuiz() {
    if (!selectedMaterialId || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/quiz/quiz-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterialId,
          spec: { mcqCount: 6, tfCount: 3, shortCount: 1 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 생성 실패");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "퀴즈 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  function openQuizEdit(quizSetId: string, currentTitle: string) {
    setEditingQuizSetId(quizSetId);
    setEditQuizTitle(currentTitle);
    setEditQuizOpen(true);
  }

  function openQuizDelete(quizSetId: string) {
    setEditingQuizSetId(quizSetId);
    setDeleteQuizOpen(true);
  }

  async function updateQuiz() {
    if (!editingQuizSetId || !editQuizTitle.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/quiz/quiz-sets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizSetId: editingQuizSetId, title: editQuizTitle.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 수정 실패");
      setEditQuizOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "퀴즈 수정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuiz() {
    if (!editingQuizSetId || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/quiz/quiz-sets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizSetId: editingQuizSetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "퀴즈 삭제 실패");
      setDeleteQuizOpen(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "퀴즈 삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function openSubjectStats(subjectId: string) {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/materials?subjectId=${encodeURIComponent(subjectId)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error ?? "통계 조회 실패");

      const firstMaterialId = Array.isArray(data) && data.length > 0 ? String(data[0].id ?? "") : "";
      if (!firstMaterialId) {
        throw new Error("해당 과목에 파일이 없어 통계를 열 수 없습니다.");
      }

      setStatsMaterialId(firstMaterialId);
      setStatsOpen(true);
    } catch (e: any) {
      setMsg(e?.message ?? "통계 조회 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-slate-50 px-3 py-3 text-slate-900 sm:px-4">
      <div className="mx-auto flex h-[calc(100vh-110px)] max-w-[1440px] flex-col gap-3">
        {msg && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>}
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePanel("subject")}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              mobilePanel === "subject"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            학기/과목
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("file")}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              mobilePanel === "file"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            파일
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("content")}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              mobilePanel === "content"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            컨텐츠
          </button>
        </div>
        <div
          ref={layoutRef}
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:gap-0 lg:[grid-template-columns:minmax(320px,var(--left-col))_8px_minmax(360px,var(--mid-col))_8px_minmax(360px,var(--right-col))]"
          style={
            {
              "--left-col": `${leftPct}fr`,
              "--mid-col": `${midPct}fr`,
              "--right-col": `${Math.max(20, 100 - leftPct - midPct)}fr`,
            } as Record<string, string>
          }
        >
          <div className={`${mobilePanel === "subject" ? "block" : "hidden"} lg:block`}>
            <SubjectPanel
            grades={grades}
            subjects={subjects}
            selectedGradeId={selectedGradeId}
            selectedSubjectId={selectedSubjectId}
            onSelectGrade={(gradeId) => pushWith({ gradeId, subjectId: undefined, materialId: undefined })}
            onSelectSubject={(subjectId) => {
              pushWith({ gradeId: selectedGradeId, subjectId, materialId: undefined });
              setMobilePanel("file");
            }}
            onOpenSubjectStats={(subjectId) => void openSubjectStats(subjectId)}
            onAddSubject={() => subjectState.setAddOpen(true)}
            onEditSubject={(subject) => {
              subjectState.setSelectedSubject(subject);
              subjectState.setEditName(subject.name);
              subjectState.setEditOpen(true);
            }}
            onDeleteSubject={(subject) => {
              subjectState.setSelectedSubject(subject);
              subjectState.setDeleteOpen(true);
            }}
          />
          </div>

          <div className="relative hidden lg:block">
            <button
              type="button"
              aria-label="왼쪽 패널 크기 조절"
              onMouseDown={() => setDragging("left")}
              className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 cursor-col-resize rounded bg-slate-200 hover:bg-slate-400"
            />
          </div>

          <section className={`min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${mobilePanel === "file" ? "block" : "hidden"} lg:block`}>
            <div className="flex h-full min-h-0 flex-col">
            <h2 className="text-sm font-semibold text-slate-900">파일</h2>
            <label className={`mt-2 flex h-14 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium ${selectedSubjectId ? "border-slate-300 bg-slate-50 hover:bg-slate-100" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
              파일 추가
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={!selectedSubjectId}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.currentTarget.value = "";
                  void uploadMaterial(file);
                }}
              />
            </label>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pb-1">
              {materials.map((m) => {
                const selected = m.id === selectedMaterialId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      pushWith({ gradeId: selectedGradeId, subjectId: selectedSubjectId, materialId: m.id });
                      setMobilePanel("content");
                    }}
                    className={`group relative block w-full rounded-xl border p-3 text-left ${selected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="pr-24">
                      <div className="text-sm font-medium text-slate-900">{m.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{m.week}주차</div>
                    </div>

                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs opacity-0 transition hover:bg-slate-100 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          const p = new URLSearchParams();
                          if (selectedGradeId) p.set("gradeId", selectedGradeId);
                          if (selectedSubjectId) p.set("subjectId", selectedSubjectId);
                          p.set("materialId", m.id);
                          p.set("returnTo", subjectReturnTo);
                          router.push(`/record?${p.toString()}`);
                        }}
                      >
                        기록
                      </button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <MoreActionsMenu
                        items={[
                          { key: "edit", label: "수정", onClick: () => openMaterialEdit(m) },
                          { key: "delete", label: "삭제", tone: "danger", onClick: () => openMaterialDelete(m) },
                        ]}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
          </section>

          <div className="relative hidden lg:block">
            <button
              type="button"
              aria-label="가운데 패널 크기 조절"
              onMouseDown={() => setDragging("right")}
              className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 cursor-col-resize rounded bg-slate-200 hover:bg-slate-400"
            />
          </div>

          <section className={`min-h-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${mobilePanel === "content" ? "block" : "hidden"} lg:block`}>
            <div className="flex h-full min-h-0 flex-col">
            <h2 className="text-sm font-semibold text-slate-900">컨텐츠</h2>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex gap-2">
                <button type="button" disabled={!selectedMaterialId || busy} onClick={() => void createSummary()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">요약</button>
                <button type="button" disabled={!selectedMaterialId || busy} onClick={() => void createQuiz()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">퀴즈</button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button type="button" className={`rounded-lg px-2 py-1 text-xs ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100"}`} onClick={() => setFilter("all")}>전체</button>
                <button type="button" className={`rounded-lg px-2 py-1 text-xs ${filter === "summary" ? "bg-slate-900 text-white" : "bg-slate-100"}`} onClick={() => setFilter("summary")}>요약본</button>
                <button type="button" className={`rounded-lg px-2 py-1 text-xs ${filter === "quiz" ? "bg-slate-900 text-white" : "bg-slate-100"}`} onClick={() => setFilter("quiz")}>퀴즈</button>
              </div>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </div>

            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto pb-1">
              {mergedContent.map((item) => (
                <div key={`${item.type}-${item.id}`} className="group rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDaysAgo(item.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] uppercase text-slate-600">{item.type}</span>
                      {item.type === "quiz" && (
                        <MoreActionsMenu
                          items={[
                            { key: "edit", label: "수정", onClick: () => openQuizEdit(item.id, item.title) },
                            { key: "delete", label: "삭제", tone: "danger", onClick: () => openQuizDelete(item.id) },
                          ]}
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{item.meta}</div>

                  {item.type === "quiz" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/quiz/take/${item.id}?mode=resume&returnTo=${encodeURIComponent(subjectReturnTo)}`
                          )
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        풀기
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/quiz/result/${item.latestAttempt?.id ?? ""}?returnTo=${encodeURIComponent(
                              subjectReturnTo
                            )}`
                          )
                        }
                        disabled={
                          !item.latestAttempt?.id ||
                          (item.latestAttempt?.status !== "SUBMITTED" &&
                            item.latestAttempt?.status !== "GRADED")
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        결과
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
          </section>
        </div>
      </div>

      <Modal open={subjectState.addOpen} onClose={() => subjectState.setAddOpen(false)} title="과목 추가" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => subjectState.setAddOpen(false)}>취소</button><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50" onClick={() => void createSubject()} disabled={!subjectState.newName.trim() || busy}>추가</button></>}>
        <input value={subjectState.newName} onChange={(e) => subjectState.setNewName(e.target.value)} maxLength={50} placeholder="예: 데이터베이스" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400" />
      </Modal>

      <Modal open={subjectState.editOpen} onClose={() => subjectState.setEditOpen(false)} title="과목 수정" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => subjectState.setEditOpen(false)}>취소</button><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50" onClick={() => void updateSubject()} disabled={!subjectState.editName.trim() || busy}>저장</button></>}>
        <input value={subjectState.editName} onChange={(e) => subjectState.setEditName(e.target.value)} maxLength={50} className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400" />
      </Modal>

      <Modal open={subjectState.deleteOpen} onClose={() => subjectState.setDeleteOpen(false)} title="과목 삭제" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => subjectState.setDeleteOpen(false)}>취소</button><button className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50" onClick={() => void deleteSubject()} disabled={busy}>삭제</button></>}>
        <div className="text-sm text-slate-700">정말 삭제할까요? 연결된 파일도 함께 삭제됩니다.</div>
      </Modal>

      <Modal open={editMaterialOpen} onClose={() => setEditMaterialOpen(false)} title="파일 수정" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setEditMaterialOpen(false)}>취소</button><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50" onClick={() => void updateMaterial()} disabled={!editMaterialTitle.trim() || busy}>저장</button></>}>
        <div className="space-y-3">
          <input value={editMaterialTitle} onChange={(e) => setEditMaterialTitle(e.target.value)} maxLength={100} placeholder="파일 제목" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400" />
          <input type="number" min={1} value={editMaterialWeek} onChange={(e) => setEditMaterialWeek(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400" />
        </div>
      </Modal>

      <Modal open={deleteMaterialOpen} onClose={() => setDeleteMaterialOpen(false)} title="파일 삭제" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setDeleteMaterialOpen(false)}>취소</button><button className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50" onClick={() => void deleteMaterial()} disabled={busy}>삭제</button></>}>
        <div className="text-sm text-slate-700">선택한 파일을 삭제할까요?</div>
      </Modal>

      <Modal open={editQuizOpen} onClose={() => setEditQuizOpen(false)} title="퀴즈 수정" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setEditQuizOpen(false)}>취소</button><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50" onClick={() => void updateQuiz()} disabled={!editQuizTitle.trim() || busy}>저장</button></>}>
        <input value={editQuizTitle} onChange={(e) => setEditQuizTitle(e.target.value)} maxLength={100} placeholder="퀴즈 제목" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-gray-400" />
      </Modal>

      <Modal open={deleteQuizOpen} onClose={() => setDeleteQuizOpen(false)} title="퀴즈 삭제" footer={<><button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setDeleteQuizOpen(false)}>취소</button><button className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50" onClick={() => void deleteQuiz()} disabled={busy}>삭제</button></>}>
        <div className="text-sm text-slate-700">선택한 퀴즈를 삭제할까요?</div>
      </Modal>

      <MaterialStatsModal
        materialId={statsMaterialId}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
      />
    </div>
  );
}
