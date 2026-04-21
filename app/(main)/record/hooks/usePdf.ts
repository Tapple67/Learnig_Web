"use client";

import { useEffect, useState } from "react";

export function usePdf(activeMaterialId: string, setMsg: (v: string) => void) {
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

      if (!url) {
        setMsg("signedUrl이 비어있음");
      }
    } catch {
      setSignedUrl("");
      setMsg("signedUrl 요청 중 네트워크 오류");
    } finally {
      setLoadingFileUrl(false);
    }
  }

  useEffect(() => {
    if (!activeMaterialId) {
      setSignedUrl("");
      return;
    }

    fetchSignedUrl(activeMaterialId);
  }, [activeMaterialId]);

  return {
    signedUrl,
    loadingFileUrl,
    setSignedUrl,
  };
}