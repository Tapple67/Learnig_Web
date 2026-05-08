"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string };

type InitialQuery = {
  gradeId: string;
  subjectId: string;
  materialId: string;
};

function readInitialQuery(): InitialQuery {
  if (typeof window === "undefined") {
    return { gradeId: "", subjectId: "", materialId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    gradeId: params.get("gradeId") ?? "",
    subjectId: params.get("subjectId") ?? "",
    materialId: params.get("materialId") ?? "",
  };
}

export function useMaterials() {
  const searchParams = useSearchParams();
  const initialQueryRef = useRef<InitialQuery>(readInitialQuery());
  const initialMaterialAppliedRef = useRef(false);
  const urlSelectionSyncedRef = useRef(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState("");

  async function reloadMaterials(subjectId: string, preferredMaterialId?: string) {
    try {
      const res = await fetch(`/api/materials?subjectId=${subjectId}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      const list: Material[] = Array.isArray(data) ? data : [];

      setMaterials(list);

      if (list.length === 0) {
        setActiveMaterialId("");
        return;
      }

      if (preferredMaterialId && list.some((m) => m.id === preferredMaterialId)) {
        setActiveMaterialId(preferredMaterialId);
        return;
      }

      setActiveMaterialId((prev) => {
        if (prev && list.some((m) => m.id === prev)) return prev;
        return list[0].id;
      });
    } catch {
      setMaterials([]);
      setActiveMaterialId("");
    }
  }

  useEffect(() => {
    async function loadGrades() {
      try {
        const res = await fetch("/api/grades", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        const list: Grade[] = Array.isArray(data) ? data : [];

        setGrades(list);

        if (list.length === 0) {
          setSelectedGradeId("");
          setSubjects([]);
          setSelectedSubjectId("");
          setMaterials([]);
          setActiveMaterialId("");
          return;
        }

        const wantedGradeId = initialQueryRef.current.gradeId;
        const initialGradeId = list.some((g) => g.id === wantedGradeId)
          ? wantedGradeId
          : list[0].id;

        setSelectedGradeId(initialGradeId);
      } catch {
        setGrades([]);
      }
    }

    void loadGrades();
  }, []);

  useEffect(() => {
    if (!selectedGradeId) return;

    async function loadSubjects() {
      try {
        const res = await fetch(`/api/subjects?gradeId=${selectedGradeId}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => []);
        const list: Subject[] = Array.isArray(data) ? data : [];

        setSubjects(list);

        if (list.length === 0) {
          setSelectedSubjectId("");
          setMaterials([]);
          setActiveMaterialId("");
          return;
        }

        const wantedSubjectId = initialQueryRef.current.subjectId;
        const nextSubjectId = list.some((s) => s.id === wantedSubjectId)
          ? wantedSubjectId
          : list[0].id;

        setSelectedSubjectId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return nextSubjectId;
        });
      } catch {
        setSubjects([]);
      }
    }

    void loadSubjects();
  }, [selectedGradeId]);

  useEffect(() => {
    if (!selectedSubjectId) return;

    const preferredMaterialId = !initialMaterialAppliedRef.current
      ? initialQueryRef.current.materialId || undefined
      : undefined;

    initialMaterialAppliedRef.current = true;
    void reloadMaterials(selectedSubjectId, preferredMaterialId);
  }, [selectedSubjectId]);

  useEffect(() => {
    if (urlSelectionSyncedRef.current) return;

    const queryGradeId = searchParams.get("gradeId") ?? "";
    const querySubjectId = searchParams.get("subjectId") ?? "";
    const queryMaterialId = searchParams.get("materialId") ?? "";
    const hasQuery = Boolean(queryGradeId || querySubjectId || queryMaterialId);

    if (!hasQuery) {
      urlSelectionSyncedRef.current = true;
      return;
    }

    if (queryGradeId && grades.some((g) => g.id === queryGradeId) && selectedGradeId !== queryGradeId) {
      setSelectedGradeId(queryGradeId);
      return;
    }

    if (
      querySubjectId &&
      subjects.some((s) => s.id === querySubjectId) &&
      selectedSubjectId !== querySubjectId
    ) {
      setSelectedSubjectId(querySubjectId);
      return;
    }

    if (
      queryMaterialId &&
      materials.some((m) => m.id === queryMaterialId) &&
      activeMaterialId !== queryMaterialId
    ) {
      setActiveMaterialId(queryMaterialId);
      return;
    }

    const gradeReady =
      !queryGradeId ||
      (grades.length > 0 && (!grades.some((g) => g.id === queryGradeId) || selectedGradeId === queryGradeId));
    const subjectReady =
      !querySubjectId ||
      (subjects.length > 0 &&
        (!subjects.some((s) => s.id === querySubjectId) || selectedSubjectId === querySubjectId));
    const materialReady =
      !queryMaterialId ||
      (materials.length > 0 &&
        (!materials.some((m) => m.id === queryMaterialId) || activeMaterialId === queryMaterialId));

    if (gradeReady && subjectReady && materialReady) {
      urlSelectionSyncedRef.current = true;
    }
  }, [
    activeMaterialId,
    grades,
    materials,
    searchParams,
    selectedGradeId,
    selectedSubjectId,
    subjects,
  ]);

  return {
    grades,
    subjects,
    materials,
    selectedGradeId,
    selectedSubjectId,
    activeMaterialId,
    setSelectedGradeId,
    setSelectedSubjectId,
    setActiveMaterialId,
    reloadMaterials,
  };
}
