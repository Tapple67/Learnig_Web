"use client";

import { useState } from "react";
import type { Subject } from "../types";

export function useSubjectPanelState() {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");

  return {
    addOpen,
    setAddOpen,
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    selectedSubject,
    setSelectedSubject,
    newName,
    setNewName,
    editName,
    setEditName,
  };
}
