/**
 * Formatter and Parser for Safety Module Official Document Numbers.
 * Standard format: "[numberPart]/[symbolPart]" (e.g. "12/ct2", "15/KH-KT").
 */

export interface ParsedOfficialDocumentNumber {
  numberPart: string;
  symbolPart: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Parses a raw canonical official document number string (e.g. "12/ct2", "15/KH-KT") into two parts.
 */
export function parseOfficialDocumentNumber(raw?: string | null): ParsedOfficialDocumentNumber {
  if (!raw || !raw.trim()) {
    return { numberPart: "", symbolPart: "", isValid: true };
  }

  const cleaned = raw.trim();

  // If string contains multiple slashes (e.g. 12//ct2 or 12/ /ct2)
  const slashCount = (cleaned.match(/\//g) || []).length;
  if (slashCount > 1) {
    return {
      numberPart: cleaned,
      symbolPart: "",
      isValid: false,
      errorMessage: "Số văn bản chứa quá nhiều ký tự / (chỉ được có 1 dấu /)",
    };
  }

  if (slashCount === 1) {
    const parts = cleaned.split("/");
    const numPart = parts[0].trim();
    const symPart = parts[1].trim();

    if (!numPart && !symPart) {
      return { numberPart: "", symbolPart: "", isValid: true };
    }

    if (!numPart || !symPart) {
      return {
        numberPart: numPart,
        symbolPart: symPart,
        isValid: false,
        errorMessage: "Vui lòng nhập đầy đủ cả số và ký hiệu văn bản (VD: 12/ct2)",
      };
    }

    // Number part should only contain digits
    if (!/^\d+$/.test(numPart)) {
      return {
        numberPart: numPart,
        symbolPart: symPart,
        isValid: false,
        errorMessage: "Phần số thứ tự chỉ được bao gồm chữ số (VD: 12)",
      };
    }

    return {
      numberPart: numPart,
      symbolPart: symPart,
      isValid: true,
    };
  }

  // Legacy string without slash (e.g. "12")
  if (/^\d+$/.test(cleaned)) {
    return {
      numberPart: cleaned,
      symbolPart: "",
      isValid: false,
      errorMessage: "Cần bổ sung phần ký hiệu sau dấu / (VD: ct2)",
    };
  }

  return {
    numberPart: cleaned,
    symbolPart: "",
    isValid: false,
    errorMessage: "Cấu trúc số văn bản không đúng định dạng (VD: 12/ct2)",
  };
}

/**
 * Formats the numberPart and symbolPart into a canonical string "12/ct2" or empty "".
 */
export function formatOfficialDocumentNumber(numberPart: string, symbolPart: string): string {
  const num = numberPart.trim();
  const sym = symbolPart.trim();

  if (!num && !sym) return "";
  if (num && sym) return `${num}/${sym}`;

  // If partial input, join with slash or raw text
  if (num) return `${num}/`;
  return `/${sym}`;
}

/**
 * Handles pasting a full string like "12/ct2" into input.
 */
export function handleOfficialDocumentNumberPaste(pastedText: string): { numberPart: string; symbolPart: string } {
  const cleaned = pastedText.trim();
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    const numPart = parts[0].trim().replace(/\D/g, ""); // digits only
    const symPart = parts.slice(1).join("/").trim();
    return { numberPart: numPart, symbolPart: symPart };
  }

  // If digits only
  if (/^\d+$/.test(cleaned)) {
    return { numberPart: cleaned, symbolPart: "" };
  }

  return { numberPart: "", symbolPart: cleaned };
}
