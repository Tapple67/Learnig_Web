"use client";

import { useEffect, useState } from "react";

type Grade = { id: string; year: number; term: number };
type Subject = { id: string; name: string };
type Material = { id: string; week: number; title: string };

export function useMaterials() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState("");

  useEffect(() => {
    async function loadGrades() {
      try {
        const res = await fetch("/api/grades", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        const list: Grade[] = Array.isArray(data) ? data : [];

        setGrades(list);

        if (list.length > 0) {
          setSelectedGradeId((prev) => {
            if (prev && list.some((g) => g.id === prev)) return prev;
            return list[0].id;
          });
        } else {
          setSelectedGradeId("");
          setSubjects([]);
          setSelectedSubjectId("");
          setMaterials([]);
          setActiveMaterialId("");
        }
      } catch {
        setGrades([]);
      }
    }

    loadGrades();
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

        if (list.length > 0) {
          setSelectedSubjectId((prev) => {
            if (prev && list.some((s) => s.id === prev)) return prev;
            return list[0].id;
          });
        } else {
          setSelectedSubjectId("");
          setMaterials([]);
          setActiveMaterialId("");
        }
      } catch {
        setSubjects([]);
      }
    }

    loadSubjects();
  }, [selectedGradeId]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setMaterials([]);
      setActiveMaterialId("");
      return;
    }

    reloadMaterials(selectedSubjectId);
  }, [selectedSubjectId]);

  async function reloadMaterials(subjectId: string, preferredMaterialId?: string) {
    try {
      const res = await fetch(`/api/materials?subjectId=${subjectId}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      const list: Material[] = Array.isArray(data) ? data : [];

      setMaterials(list);

      if (list.length > 0) {
        if (preferredMaterialId && list.some((m) => m.id === preferredMaterialId)) {
          setActiveMaterialId(preferredMaterialId);
          return;
        }

        setActiveMaterialId((prev) => {
          if (prev && list.some((m) => m.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setActiveMaterialId("");
      }
    } catch {
      setMaterials([]);
      setActiveMaterialId("");
    }
  }

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