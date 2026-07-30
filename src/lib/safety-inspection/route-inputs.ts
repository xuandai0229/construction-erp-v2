import type { z } from "zod";
import type { safetyScheduleSchema } from "./api-schemas";

export function configuredScheduleDataFromBody(
  body: z.infer<typeof safetyScheduleSchema>,
) {
  return {
    projectId: body.projectId,
    scheduledDate: body.scheduledDate,
    shift: body.shift,
    kind: body.kind,
    constructionType: body.constructionType,
    location: body.location ?? null,
    plannedFreeText: body.plannedFreeText ?? null,
    trainingContent: body.trainingContent ?? null,
    startAt: body.startAt ?? null,
    expectedEndAt: body.expectedEndAt ?? null,
    changeNote: body.changeNote ?? null,
    sortOrder: body.sortOrder,
    collaboratorUserIds: body.collaboratorUserIds,
    checklistItemIds: body.checklistItemIds,
  };
}
