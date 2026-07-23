export type SupervisionUnitCode =
  | "METER"
  | "SQUARE_METER"
  | "CUBIC_METER"
  | "KILOGRAM"
  | "TON"
  | "PIECE"
  | "SET"
  | "PERCENT"
  | "DAY"
  | "CUSTOM";

export type NormalizedUnit = { code: SupervisionUnitCode; label: string; recognized: boolean };

const UNIT_ALIASES: Record<string, Omit<NormalizedUnit, "recognized">> = {
  m: { code: "METER", label: "m" },
  m1: { code: "METER", label: "m" },
  m2: { code: "SQUARE_METER", label: "m²" },
  "m^2": { code: "SQUARE_METER", label: "m²" },
  "m²": { code: "SQUARE_METER", label: "m²" },
  m3: { code: "CUBIC_METER", label: "m³" },
  "m^3": { code: "CUBIC_METER", label: "m³" },
  "m³": { code: "CUBIC_METER", label: "m³" },
  kg: { code: "KILOGRAM", label: "kg" },
  t: { code: "TON", label: "tấn" },
  tan: { code: "TON", label: "tấn" },
  "tấn": { code: "TON", label: "tấn" },
  cai: { code: "PIECE", label: "cái" },
  "cái": { code: "PIECE", label: "cái" },
  bo: { code: "SET", label: "bộ" },
  "bộ": { code: "SET", label: "bộ" },
  "%": { code: "PERCENT", label: "%" },
  ngay: { code: "DAY", label: "ngày" },
  "ngày": { code: "DAY", label: "ngày" },
};

function accentless(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function normalizeSupervisionUnit(input: string | null | undefined): NormalizedUnit | null {
  const original = input?.trim();
  if (!original) return null;
  const compact = original.toLocaleLowerCase("vi-VN").replace(/\s+/g, "");
  const normalized = UNIT_ALIASES[compact] || UNIT_ALIASES[accentless(compact)];
  return normalized ? { ...normalized, recognized: true } : { code: "CUSTOM", label: original, recognized: false };
}

export function parseLocalizedNumber(input: string): number | null {
  let text = input.trim().replace(/\s+/g, "");
  if (!/^[+-]?[\d.,]+$/.test(text)) return null;
  const sign = text.startsWith("-") ? -1 : 1;
  text = text.replace(/^[+-]/, "");
  const dots = [...text.matchAll(/\./g)].map((match) => match.index!);
  const commas = [...text.matchAll(/,/g)].map((match) => match.index!);

  if (dots.length && commas.length) {
    const decimalSeparator = dots.at(-1)! > commas.at(-1)! ? "." : ",";
    const groupingSeparator = decimalSeparator === "." ? "," : ".";
    text = text.split(groupingSeparator).join("").replace(decimalSeparator, ".");
  } else {
    const separator = dots.length ? "." : commas.length ? "," : null;
    if (separator) {
      const parts = text.split(separator);
      if (parts.length > 2) {
        if (!parts.slice(1).every((part) => part.length === 3)) return null;
        text = parts.join("");
      } else if (parts[1]?.length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
        text = parts.join("");
      } else {
        text = `${parts[0]}.${parts[1] || "0"}`;
      }
    }
  }

  const value = Number(text) * sign;
  return Number.isFinite(value) ? value : null;
}

export type ParsedQuantity =
  | { mode: "NUMBER"; rawInput: string; numericValue: number; unitCode: SupervisionUnitCode | null; unitLabel: string | null }
  | { mode: "TEXT"; rawInput: string; textValue: string };

export function parseSupervisionQuantityInput(rawInput: string, unitHint?: string | null): ParsedQuantity {
  const raw = rawInput.trim();
  const match = raw.match(/^([+-]?[\d][\d.,\s]*)(?:\s*)(.*)$/u);
  if (!match) return { mode: "TEXT", rawInput, textValue: raw };
  const numericValue = parseLocalizedNumber(match[1]);
  if (numericValue == null) return { mode: "TEXT", rawInput, textValue: raw };
  const unit = normalizeSupervisionUnit(match[2] || unitHint);
  return { mode: "NUMBER", rawInput, numericValue, unitCode: unit?.code || null, unitLabel: unit?.label || null };
}

export function formatSupervisionQuantity(value: number | null | undefined, text: string | null | undefined, unit: string | null | undefined) {
  if (value == null) return text?.trim() || "";
  const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(value);
  return [number, normalizeSupervisionUnit(unit)?.label || unit?.trim()].filter(Boolean).join(" ");
}

export function calculateSupervisionVariance(
  reported: { value: number | null; unitCode: string | null },
  verified: { value: number | null; unitCode: string | null },
) {
  if (reported.value == null || verified.value == null || !reported.unitCode || reported.unitCode !== verified.unitCode) return null;
  return verified.value - reported.value;
}

export type SupervisionVarianceStatus = "UNCHECKED" | "MATCH" | "SHORTAGE" | "EXCESS";

export type SupervisionQuantityVarianceResult = {
  status: SupervisionVarianceStatus;
  reportedNumber: number | null;
  verifiedNumber: number | null;
  absoluteDifference: number | null;
  percentageDifference: number | null;
  unit: string;
  displayText: string;
};

export function calculateSupervisionQuantityVariance(
  reportedValue: number | null | undefined,
  verifiedValue: number | null | undefined,
  reportedText: string | null | undefined,
  verifiedText: string | null | undefined,
  unitCode: string | null | undefined,
  unitLabel: string | null | undefined,
  varianceReason: string | null | undefined
): SupervisionQuantityVarianceResult {
  const isUnchecked = verifiedValue == null && !verifiedText?.trim() && !verifiedText?.trim().match(/[\d.,]+/); // Check if verified doesn't have number
  // Actually, wait, the standard check is:
  const isUncheckedCheck = verifiedValue == null && !verifiedText?.trim();
  
  const reportedQuantity = reportedValue ?? null;
  const verifiedQuantity = verifiedValue ?? null;
  
  const variance = isUncheckedCheck ? null : (reportedQuantity != null && verifiedQuantity != null ? verifiedQuantity - reportedQuantity : null);
  const percentage = variance != null && reportedQuantity ? (variance / reportedQuantity) * 100 : null;
  
  let status: SupervisionVarianceStatus = "UNCHECKED";
  if (!isUncheckedCheck) {
    if (variance === 0) status = "MATCH";
    else if (variance != null && variance < 0) status = "SHORTAGE";
    else if (variance != null && variance > 0) status = "EXCESS";
    else if (reportedQuantity === verifiedQuantity && reportedQuantity != null) status = "MATCH";
  }

  const percentageText = reportedQuantity === 0 ? "—" : (percentage != null ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2, signDisplay: "always" }).format(percentage) + "%" : "");
  const unitStr = unitLabel || "";

  let displayText = "";
  if (status === "UNCHECKED") {
    displayText = "Chưa có khối lượng kiểm tra";
  } else if (status === "MATCH") {
    displayText = `Khớp báo cáo\n0 ${unitStr} · 0%`;
  } else if (status === "SHORTAGE") {
    displayText = `Thiếu ${formatSupervisionQuantity(Math.abs(variance!), null, null)} ${unitStr} so với báo cáo\n${percentageText}`;
  } else if (status === "EXCESS") {
    displayText = `Vượt ${formatSupervisionQuantity(Math.abs(variance!), null, null)} ${unitStr} so với báo cáo\n${percentageText}`;
  }

  if (varianceReason && status !== "MATCH" && status !== "UNCHECKED") {
    displayText += `\nLý do: ${varianceReason}`;
  }

  return {
    status,
    reportedNumber: reportedQuantity,
    verifiedNumber: verifiedQuantity,
    absoluteDifference: variance != null ? Math.abs(variance) : null,
    percentageDifference: percentage,
    unit: unitStr,
    displayText
  };
}
