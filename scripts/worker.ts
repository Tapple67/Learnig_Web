/* scripts/worker.ts */   //npx tsx scripts/worker.ts
import os from "os";
import { prisma } from "../lib/db"; 
import { supabaseService } from "../lib/storage"; // 

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const POLL_MS = 1500;

async function getPdfjs() {
  
  return await import("pdfjs-dist/legacy/build/pdf");
}

// ====== Job 락 잡고 1개 가져오기 ======
async function claimNextJob() {
  const rows = await prisma.$queryRaw<any[]>`
    UPDATE "Job"
    SET
      status = 'RUNNING',
      "lockedAt" = NOW(),
      "lockedBy" = ${WORKER_ID},
      attempts = attempts + 1,
      "updatedAt" = NOW()
    WHERE id = (
      SELECT id
      FROM "Job"
      WHERE status = 'PENDING'
        AND attempts < "maxAttempts"
      ORDER BY priority DESC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `;
  return rows[0] ?? null;
}

// ====== PDF 다운로드 ======
async function downloadPdfFromSupabase(bucket: string, path: string): Promise<Uint8Array> {
  const supabase = supabaseService();

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`스토리지 다운로드 실패: ${error?.message ?? "unknown"}`);

  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
} 

// ====== PDF 페이지별 텍스트 추출 (pdfjs) ======
async function extractPagesText(pdfBytes: Uint8Array) {
  const pdfjsLib: any = await getPdfjs();

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes as any });
  const pdf = await loadingTask.promise;

  const pages: { page: number; text: string }[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = (content.items as any[])
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean);

    const text = strings.join(" ").replace(/\s+/g, " ").trim();
    pages.push({ page: p, text });
  }
  return pages;
}

function summarizeError(err: any) {
  const msg = err?.message ?? String(err);
  return msg.slice(0, 2000);
}

// ====== Job 처리 ======
async function handleExtractPdf(job: any) {
  const materialId: string | null = job.materialId;
  if (!materialId) throw new Error("EXTRACT_PDF job에 materialId 없음");

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, storagePath: true },
  });
  if (!material) throw new Error("Material 없음");

  const bucket = job.payload?.bucket ?? "materials";
  const path = job.payload?.path ?? material.storagePath;
  if (!path) throw new Error("job.payload.path 또는 material.storagePath 없음");

  const pdfBytes = await downloadPdfFromSupabase(bucket, path);
  const pages = await extractPagesText(pdfBytes);

  await prisma.$transaction(async (tx) => {
    for (const p of pages) {
      await tx.materialPageText.upsert({
        where: { materialId_page: { materialId: material.id, page: p.page } },
        update: {
          text: p.text,
          charCount: p.text.length,
          method: "pdfjs",
          status: "DONE",
          error: null,
          extractedAt: new Date(),
        },
        create: {
          materialId: material.id,
          page: p.page,
          text: p.text,
          charCount: p.text.length,
          method: "pdfjs",
          status: "DONE",
          error: null,
          extractedAt: new Date(),
        },
      });
    }
  });
}

async function markDone(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "DONE", lastError: null, lockedAt: null, lockedBy: null },
  });
}

async function markFailed(job: any, err: any) {
  const msg = summarizeError(err);
  const nextStatus = job.attempts + 1 >= job.maxAttempts ? "FAILED" : "PENDING";

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: nextStatus,
      lastError: msg,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function workerLoop() {
  while (true) {
    const job = await claimNextJob();

    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }

    try {
      if (job.type === "EXTRACT_PDF") {
        await handleExtractPdf(job);
      } else {
        throw new Error(`지원하지 않는 job type: ${job.type}`);
      }

      await markDone(job.id);
    } catch (err) {
      await markFailed(job, err);
    }
  }
}

workerLoop().catch((e) => {
  console.error("[worker fatal]", e);
  process.exit(1);
});