// app/components/stats/MaterialStatsModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/components/ui/modal";
import MaterialStatsView from "./material_stats_view";
import type { MaterialStatsResponse } from "@/lib/stats/types";

export default function MaterialStatsModal(props: {
  materialId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { materialId, open, onClose } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<MaterialStatsResponse | null>(null);

  useEffect(() => {
    if (!open || !materialId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/stats/material?materialId=${encodeURIComponent(materialId)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error ?? "통계 조회 실패");
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "오류");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, materialId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="학습 통계"
      panelClassName="max-w-[1000px]"
      bodyClassName="!px-0 !py-0"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          닫기
        </button>
      }
    >
      <div className="h-[min(78vh,760px)] overflow-hidden bg-gradient-to-b from-slate-50 to-white p-4 md:p-5">
        {loading && <div className="py-16 text-center text-sm text-slate-500">통계를 불러오는 중입니다...</div>}

        {!loading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && data && <MaterialStatsView data={data} />}
      </div>
    </Modal>
  );
}
