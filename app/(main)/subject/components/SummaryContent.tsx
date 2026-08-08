"use client";

function HighlightedText({ text }: { text: string }) {
  const patternParts = [
    "\\*\\*[^*]+\\*\\*",
    "\\[[0-9]+\\]",
    "\\(p\\.\\s*[0-9]+(?:\\s*[-~]\\s*[0-9]+)?\\)",
    "p\\.\\s*[0-9]+(?:\\s*[-~]\\s*[0-9]+)?",
  ];
  const pattern = new RegExp(`(${patternParts.join("|")})`, "gi");
  const parts = text.split(pattern).filter(Boolean);

  return (
    <>
      {parts.map((part, idx) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return (
            <strong key={idx} className="font-semibold text-slate-950">
              {part.replace(/^\*\*|\*\*$/g, "")}
            </strong>
          );
        }

        if (
          /^\[[0-9]+\]$/.test(part) ||
          /^\(p\.\s*[0-9]+(?:\s*[-~]\s*[0-9]+)?\)$/i.test(part) ||
          /^p\.\s*[0-9]+(?:\s*[-~]\s*[0-9]+)?$/i.test(part)
        ) {
          return (
            <span key={idx} className="font-medium text-indigo-500">
              {part}
            </span>
          );
        }

        return part;
      })}
    </>
  );
}

export function getSummaryTopics(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const topLevelTopics = lines
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, ""));

  const fallbackTopics = lines
    .filter((line) => line.startsWith("### "))
    .map((line) => line.replace(/^###\s+/, ""))
    .filter((title) => !isMemoSummarySection(title) && !isStudySummarySection(title));

  const seen = new Set<string>();
  return (topLevelTopics.length > 0 ? topLevelTopics : fallbackTopics)
    .filter((topic) => {
      const displayTopic = formatTopicChip(topic);
      if (!displayTopic || seen.has(displayTopic)) return false;
      seen.add(displayTopic);
      return true;
    })
    .slice(0, 8);
}

export function formatTopicChip(topic: string) {
  return topic.replace(/^\d+[.)]\s*/, "").trim();
}

function isMemoSummarySection(title: string) {
  return title.includes("메모") || title.includes("사용자");
}

function isStudySummarySection(title: string) {
  return (
    title.includes("학습") ||
    title.includes("퀴즈") ||
    title.includes("시험") ||
    title.includes("출제") ||
    title.includes("복습") ||
    title.includes("쉽게") ||
    title.includes("헷갈")
  );
}

function getSummaryLines(content: string) {
  let subsection = "";
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("## ")) {
        const section = line.replace(/^##\s+/, "");
        subsection = /^\d+\./.test(section) ? "" : section;
      }

      if (line.startsWith("### ")) {
        subsection = line.replace(/^###\s+/, "");
      }

      return { line, subsection };
    });
}

function parseKeywordDescription(item: string) {
  const boldMatch = item.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
  if (boldMatch) return { keyword: boldMatch[1].trim(), description: boldMatch[2].trim() };

  const plainMatch = item.match(/^([^:：]{2,24})[:：]\s*(.+)$/);
  if (!plainMatch) return null;

  const keyword = plainMatch[1].trim();
  const description = plainMatch[2].trim();
  if (!keyword || !description) return null;
  if (/[.!?。]$/.test(keyword)) return null;

  return { keyword, description };
}

function parseKeywordOnly(item: string) {
  const boldMatch = item.match(/^\*\*([^*]+)\*\*$/);
  if (boldMatch) return boldMatch[1].trim();

  const plainMatch = item.match(/^([^:竊?]{2,24})[:竊?]\s*$/);
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

export default function SummaryContent({ content }: { content: string }) {
  const lines = getSummaryLines(content);

  return (
    <article className="mx-auto max-w-4xl bg-white px-5 py-5 text-slate-900 sm:px-10 sm:py-8">
      <div className="space-y-3.5">
        {lines.map(({ line, subsection }, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h2 key={idx} className="pb-4 text-2xl font-bold leading-snug tracking-normal text-slate-950">
                <HighlightedText text={line.replace(/^#\s+/, "")} />
              </h2>
            );
          }

          if (line.startsWith("## ")) {
            const title = line.replace(/^##\s+/, "");
            return (
              <h3 key={idx} className="mt-8 border-t border-slate-200 pt-6 text-xl font-bold leading-snug text-slate-950">
                <HighlightedText text={title} />
              </h3>
            );
          }

          if (line.startsWith("### ")) {
            const title = line.replace(/^###\s+/, "");
            return (
              <h4 key={idx} className="mt-6 flex items-center gap-2 text-base font-semibold text-slate-600">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <HighlightedText text={title} />
              </h4>
            );
          }

          if (/^[-*]\s+/.test(line)) {
            const item = line.replace(/^[-*]\s+/, "");
            const keywordDescription = parseKeywordDescription(item);
            const keywordOnly = parseKeywordOnly(item);
            const isEmphasized = isMemoSummarySection(subsection) || isStudySummarySection(subsection);
            const itemTone = isEmphasized ? "border-slate-100 bg-white" : "border-slate-100 bg-white";
            if (keywordDescription) {
              return (
                <div
                  key={idx}
                  className={`ml-4 border-l-2 px-4 py-3 leading-7 ${itemTone}`}
                >
                  <div className="text-base font-semibold text-slate-950">
                    <HighlightedText text={keywordDescription.keyword} />
                  </div>
                  <div className="mt-1.5 text-base text-slate-700">
                    <HighlightedText text={keywordDescription.description} />
                  </div>
                </div>
              );
            }

            if (keywordOnly) {
              return (
                <div key={idx} className="ml-4 border-l-2 border-slate-100 bg-white px-4 pb-1 pt-3">
                  <div className="text-base font-semibold leading-7 text-slate-950">
                    <HighlightedText text={keywordOnly} />
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="ml-4 flex gap-3 bg-white px-3 py-2 text-base leading-7 text-slate-700">
                <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />
                <span>
                  <HighlightedText text={item} />
                </span>
              </div>
            );
          }

          const orderedMatch = line.match(/^((?:\d+|[a-z]|[ivx]+)[.)])\s+(.+)$/i);
          if (orderedMatch) {
            return (
              <div key={idx} className="ml-4 grid grid-cols-[2.5rem_1fr] gap-3 bg-white px-3 py-2 text-base leading-7 text-slate-700">
                <span className="font-semibold text-slate-500">{orderedMatch[1]}</span>
                <span>
                  <HighlightedText text={orderedMatch[2]} />
                </span>
              </div>
            );
          }

          return (
            <p key={idx} className="ml-8 text-base leading-7 text-slate-700">
              <HighlightedText text={line} />
            </p>
          );
        })}
      </div>
    </article>
  );
}
