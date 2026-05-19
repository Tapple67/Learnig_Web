export function formatDaysAgo(iso: string): string {
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return "날짜 없음";

  const now = Date.now();
  const diff = Math.max(0, now - target);
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (day <= 0) return "오늘";
  if (day === 1) return "1일 전";
  return `${day}일 전`;
}
