import { prisma } from "@/lib/db";
import { buildMaterialPacket, computeMaterialSourceHash } from "@/app/(main)/quiz/utils/material_packet";
import { getAIProvider } from "@/ai";

function computeSignalsDigest(packet: Awaited<ReturnType<typeof buildMaterialPacket>>) {
  return JSON.stringify(
    packet.pages.map((p) => ({ page: p.page, signals: p.noteSignals ?? null }))
  );
}

export async function ensureMaterialSummary(materialId: string) {
  const packet = await buildMaterialPacket(materialId);
  const sourceHash = computeMaterialSourceHash(packet);
  const signalsDigest = computeSignalsDigest(packet);

  const existing = await prisma.materialSummary.findUnique({
    where: { materialId },
    select: { id: true, sourceHash: true, signalsDigest: true, canonical: true, content: true },
  });

  if (existing && existing.sourceHash === sourceHash && existing.signalsDigest === signalsDigest) {
    return {
      summaryId: existing.id,
      sourceHash,
      content: existing.canonical ?? existing.content,
      packet,
      reused: true,
    };
  }

  const ai = getAIProvider();
  const result = await ai.buildSummary({ packet });
  const canonical = result.canonical ?? result.content;
  const adaptive = result.adaptive ?? result.content;

  const saved = await prisma.materialSummary.upsert({
    where: { materialId },
    update: {
      sourceHash,
      signalsDigest,
      content: canonical,
      canonical,
      adaptive,
      summaryType: "both",
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    },
    create: {
      materialId,
      sourceHash,
      signalsDigest,
      content: canonical,
      canonical,
      adaptive,
      summaryType: "both",
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    },
    select: { id: true, sourceHash: true, canonical: true, content: true },
  });

  return {
    summaryId: saved.id,
    sourceHash: saved.sourceHash,
    content: saved.canonical ?? saved.content,
    packet,
    reused: false,
  };
}
