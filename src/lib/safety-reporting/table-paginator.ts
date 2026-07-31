import { SafetyPlanPreviewViewModel, formatSafetyDayLabel, formatSafetyShiftLabel } from "./plan-view-model";

export interface SafetyPlanPhysicalRow {
  rowId: string;
  dayIso: string;
  dayName: string; // "Thứ Hai, 20/07/2026" or ""
  shiftLabel: string; // "Sáng:", "Chiều:", "Tối:" or ""
  showDayHeader: boolean;
  showShiftLabel: boolean;
  isDayStart: boolean;
  projectName: string;
  inspectionContent: string;
  note: string;
}

/**
 * Splits text into clean chunks based on character count without truncating or losing any characters.
 * Guarantees: chunks.join("") === text
 */
export function chunkTextPreservingAllChars(text: string, maxCharsPerChunk: number = 600): string[] {
  if (!text) return [""];
  if (text.length <= maxCharsPerChunk) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerChunk) {
      chunks.push(remaining);
      break;
    }

    let cutIdx = -1;

    // 1. Look for double newline (paragraph break)
    const doubleNewline = remaining.lastIndexOf("\n\n", maxCharsPerChunk);
    if (doubleNewline > maxCharsPerChunk * 0.3) {
      cutIdx = doubleNewline + 2;
    } else {
      // 2. Look for single newline
      const singleNewline = remaining.lastIndexOf("\n", maxCharsPerChunk);
      if (singleNewline > maxCharsPerChunk * 0.3) {
        cutIdx = singleNewline + 1;
      } else {
        // 3. Look for sentence boundary ". "
        const periodSpace = remaining.lastIndexOf(". ", maxCharsPerChunk);
        if (periodSpace > maxCharsPerChunk * 0.3) {
          cutIdx = periodSpace + 2;
        } else {
          // 4. Look for word boundary " "
          const spaceIdx = remaining.lastIndexOf(" ", maxCharsPerChunk);
          if (spaceIdx > maxCharsPerChunk * 0.3) {
            cutIdx = spaceIdx + 1;
          } else {
            // 5. Fallback cut at maxCharsPerChunk
            cutIdx = maxCharsPerChunk;
          }
        }
      }
    }

    chunks.push(remaining.slice(0, cutIdx));
    remaining = remaining.slice(cutIdx);
  }

  return chunks;
}

/**
 * Transforms the logical SafetyPlanPreviewViewModel into physical A4-safe table rows.
 * Guarantees 21-shift matrix, bold upright day/shift labels (NO ITALICS), zero character loss,
 * and clean physical row splits.
 */
export function paginateSafetyPlanTableRows(viewModel: SafetyPlanPreviewViewModel): SafetyPlanPhysicalRow[] {
  const physicalRows: SafetyPlanPhysicalRow[] = [];
  const shiftKeys = ["MORNING", "AFTERNOON", "EVENING"] as const;

  for (const day of viewModel.days) {
    let isFirstRowOfDay = true;

    for (const sKey of shiftKeys) {
      const shiftData = day.shifts[sKey];
      const entries = shiftData.entries;
      const shiftLabel = formatSafetyShiftLabel(sKey);

      // Case 1: Empty shift slot -> 1 physical row in the 21-shift matrix with BLANK data cells
      if (entries.length === 0) {
        const showDayHeader = isFirstRowOfDay;
        isFirstRowOfDay = false;

        physicalRows.push({
          rowId: `${day.dateIso}-${sKey}-empty`,
          dayIso: day.dateIso,
          dayName: showDayHeader ? day.dayName : "",
          shiftLabel,
          showDayHeader,
          showShiftLabel: true,
          isDayStart: showDayHeader,
          projectName: "",
          inspectionContent: "",
          note: "",
        });
        continue;
      }

      // Case 2: Shift has entries -> process each logical entry
      for (let eIdx = 0; eIdx < entries.length; eIdx++) {
        const entry = entries[eIdx];
        const isFirstEntryOfShift = eIdx === 0;

        // Chunk long text fields
        const projChunks = chunkTextPreservingAllChars(entry.projectName, 350);
        const inspChunks = chunkTextPreservingAllChars(entry.inspectionContent, 650);
        const noteChunks = chunkTextPreservingAllChars(entry.note, 500);

        const maxChunks = Math.max(projChunks.length, inspChunks.length, noteChunks.length, 1);

        for (let cIdx = 0; cIdx < maxChunks; cIdx++) {
          const isFirstChunkOfEntry = cIdx === 0;
          const currentShowDayHeader = isFirstRowOfDay;
          isFirstRowOfDay = false;

          const showShiftLabel = isFirstChunkOfEntry && isFirstEntryOfShift;

          physicalRows.push({
            rowId: `${day.dateIso}-${sKey}-${eIdx}-chunk-${cIdx}`,
            dayIso: day.dateIso,
            dayName: currentShowDayHeader ? day.dayName : "",
            shiftLabel: showShiftLabel ? shiftLabel : "",
            showDayHeader: currentShowDayHeader,
            showShiftLabel,
            isDayStart: currentShowDayHeader,
            projectName: projChunks[cIdx] || "",
            inspectionContent: inspChunks[cIdx] || "",
            note: noteChunks[cIdx] || "",
          });
        }
      }
    }
  }

  return physicalRows;
}

export const buildSafetyWeeklyTableRows = paginateSafetyPlanTableRows;
