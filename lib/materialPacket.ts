import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/hash";

export type MaterialPagePacket = {
  page: number;
  pdfText: string;
  note: string;
  noteUpdatedAt: string | null;
};

export type MaterialPacket = {
  materialId: string;
  subjectId: string;
  week: number;
  title: string;
  promptVersion: string;
  pages: MaterialPagePacket[];
};

export const SUMMARY_PROMPT_VERSION = "summary.v1";

export async function buildMaterialPacket(materialId: string): Promise<MaterialPacket> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      subjectId: true,
      week: true,
      title: true,
      pageTexts: { select: { page: true, text: true }, orderBy: { page: "asc" } },
      notes: { select: { page: true, content: true, updatedAt: true }, orderBy: { page: "asc" } },
    },
  });
  if (!material) throw new Error("Material not found");

  const pagesSet = new Set<number>();
  for (const pt of material.pageTexts) pagesSet.add(pt.page);
  for (const n of material.notes) pagesSet.add(n.page);

  const pages = Array.from(pagesSet).sort((a, b) => a - b);

  const textMap = new Map(material.pageTexts.map((x) => [x.page, x.text ?? ""]));
  const noteMap = new Map(
    material.notes.map((x) => [x.page, { content: x.content ?? "", updatedAt: x.updatedAt }])
  );

  const packetPages: MaterialPagePacket[] = pages.map((p) => {
    const pdfText = (textMap.get(p) ?? "").trim();
    const n = noteMap.get(p);
    return {
      page: p,
      pdfText,
      note: (n?.content ?? "").trim(),
      noteUpdatedAt: n?.updatedAt ? n.updatedAt.toISOString() : null,
    };
  });

  return {
    materialId: material.id,
    subjectId: material.subjectId,
    week: material.week,
    title: material.title,
    promptVersion: SUMMARY_PROMPT_VERSION,
    pages: packetPages,
  };
}

export function computeMaterialSourceHash(packet: MaterialPacket) {
  const stable = {
    materialId: packet.materialId,
    promptVersion: packet.promptVersion,
    pages: packet.pages.map((p) => ({
      page: p.page,
      pdfText: p.pdfText,
      note: p.note,
      noteUpdatedAt: p.noteUpdatedAt,
    })),
  };
  return sha256(JSON.stringify(stable));
}