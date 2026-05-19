"use client";

import { useEffect, useState } from "react";

export function useNotes(activeMaterialId: string, page: number) {
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadNote() {
      if (!activeMaterialId) {
        setContent("");
        setDirty(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/notes?materialId=${activeMaterialId}&page=${page}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        setContent(data?.note?.content ?? "");
        setDirty(false);
      } catch {
        setContent("");
        setDirty(false);
      }
    }

    loadNote();
  }, [activeMaterialId, page]);

  async function saveNote() {
    if (!activeMaterialId) return;

    await fetch("/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        materialId: activeMaterialId,
        page,
        content,
      }),
    });

    setDirty(false);
  }

  return {
    content,
    setContent,
    dirty,
    setDirty,
    saveNote,
  };
}