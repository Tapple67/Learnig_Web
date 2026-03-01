import { prisma } from "@/lib/db";
import { buildMaterialPacket, computeMaterialSourceHash } from "@/lib/materialPacket";
import { getAIProvider } from "@/ai";

export async function ensureMaterialSummary(materialId: string) {
  const packet = await buildMaterialPacket(materialId);
  const sourceHash = computeMaterialSourceHash(packet);

  const existing = await prisma.materialSummary.findUnique({
    where: { materialId },
    select: { id: true, sourceHash: true, content: true },
  });

  if (existing && existing.sourceHash === sourceHash) {
    return { summaryId: existing.id, sourceHash, content: existing.content, reused: true };
  }

  const ai = getAIProvider();
  const result = await ai.buildSummary({ packet });

  const saved = await prisma.materialSummary.upsert({
    where: { materialId },
    update: {
      sourceHash,
      content: result.content,
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    },
    create: {
      materialId,
      sourceHash,
      content: result.content,
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    },
    select: { id: true, sourceHash: true, content: true },
  });

  return { summaryId: saved.id, sourceHash: saved.sourceHash, content: saved.content, reused: false };
}