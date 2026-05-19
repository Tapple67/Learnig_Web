import { useState } from "react";

export function usePage(initialPage: number, replaceQuery: any) {
  const [page, setPage] = useState(initialPage);

  async function requestPageChange(nextPage: number, saveNote: any, dirty: boolean) {
    if (dirty) {
      const ok = await saveNote();
      if (!ok) return;
    }

    const p = Math.max(1, nextPage);
    setPage(p);
    replaceQuery({ page: p });
  }

  return { page, setPage, requestPageChange };
}