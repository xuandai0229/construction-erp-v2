export type VolumeGuardLevel =
  | "OK"
  | "NEAR_LIMIT"
  | "OVER_DESIGN"
  | "REQUIRE_NOTE"
  | "BLOCK_SUBMIT"
  | "NEED_DESIGN_QUANTITY";

export function evaluateVolumeGuard(input: {
  designQuantity: number;
  cumulativeBefore: number;
  todayQuantity: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  note?: string | null;
  issueNote?: string | null;
  proposalNote?: string | null;
}): {
  projectedCumulative: number;
  percent: number;
  remaining: number;
  level: VolumeGuardLevel;
  message: string;
  canSaveDraft: boolean;
  canSubmit: boolean;
} {
  const projectedCumulative = input.cumulativeBefore + input.todayQuantity;

  if (input.designQuantity <= 0) {
    return {
      projectedCumulative,
      percent: 0,
      remaining: 0,
      level: "NEED_DESIGN_QUANTITY",
      message: "Chưa có khối lượng thiết kế",
      canSaveDraft: true,
      canSubmit: false,
    };
  }

  const percent = (projectedCumulative / input.designQuantity) * 100;
  const remaining = Math.max(0, input.designQuantity - projectedCumulative);
  
  const hasValidNote =
    (input.note && input.note.trim().length >= 10) ||
    (input.issueNote && input.issueNote.trim().length >= 10) ||
    (input.proposalNote && input.proposalNote.trim().length >= 10);

  let level: VolumeGuardLevel = "OK";
  let message = "Trong giới hạn";
  let canSubmit = true;

  if (percent <= 90) {
    level = "OK";
    message = "Trong giới hạn";
    canSubmit = true;
  } else if (percent > 90 && percent <= 100) {
    level = "NEAR_LIMIT";
    message = "Gần hết KL";
    canSubmit = true;
  } else if (percent > 100 && percent <= 110) {
    if (input.status === "SUBMITTED" && !hasValidNote) {
      level = "REQUIRE_NOTE";
      message = "Cần lý do";
      canSubmit = false;
    } else {
      level = "REQUIRE_NOTE";
      message = "Vượt KL (100-110%)";
      canSubmit = true;
    }
  } else if (percent > 110) {
    if (input.status === "DRAFT") {
      level = "OVER_DESIGN";
      message = "Vượt thiết kế";
      canSubmit = false;
    } else {
      if (!hasValidNote) {
        level = "BLOCK_SUBMIT";
        message = "Chặn gửi";
        canSubmit = false;
      } else {
        level = "OVER_DESIGN";
        message = "Vượt thiết kế";
        canSubmit = true;
      }
    }
  }

  return {
    projectedCumulative,
    percent,
    remaining,
    level,
    message,
    canSaveDraft: true, // DRAFT is always allowed
    canSubmit,
  };
}
