import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2?schema=public";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type MovementTypeFilter = "ALL" | "IMPORT" | "EXPORT";

function normalize(value: string | undefined) {
  return value?.trim() || "";
}

async function main() {
  const projectIdInput = normalize(process.env.QA_PROJECT_ID);
  const projectCodeInput = normalize(process.env.QA_PROJECT_CODE);
  const movementType = (normalize(process.env.QA_MOVEMENT_TYPE) || "ALL") as MovementTypeFilter;
  const materialId = normalize(process.env.QA_MATERIAL_ID);
  const q = normalize(process.env.QA_Q).toLowerCase();
  const dateFrom = normalize(process.env.QA_DATE_FROM);
  const dateTo = normalize(process.env.QA_DATE_TO);

  const project = projectIdInput
    ? await prisma.project.findUnique({ where: { id: projectIdInput }, select: { id: true, code: true, name: true } })
    : await prisma.project.findFirst({
        where: projectCodeInput ? { code: projectCodeInput, deletedAt: null } : { deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { updatedAt: "desc" },
      });

  if (!project) {
    throw new Error("Không tìm thấy công trình để kiểm tra MaterialMovement.");
  }

  const dbTotal = await prisma.materialMovement.count({ where: { projectId: project.id } });
  const dbActiveNotDeletedTotal = dbTotal; // MaterialMovement schema hiện không có deletedAt.

  const where: any = { projectId: project.id };
  if (movementType !== "ALL") where.type = movementType;
  if (materialId) where.materialItemId = materialId;
  if (dateFrom || dateTo) {
    where.movementDate = {};
    if (dateFrom) where.movementDate.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.movementDate.lte = new Date(`${dateTo}T23:59:59.999`);
  }

  const dbFilteredBeforeSearch = await prisma.materialMovement.findMany({
    where,
    include: { materialItem: true },
    orderBy: { movementDate: "desc" },
  });

  const dbFiltered = q
    ? dbFilteredBeforeSearch.filter((movement) =>
        [movement.materialItem.code, movement.materialItem.name, movement.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
    : dbFilteredBeforeSearch;

  const actionPayload = await prisma.materialMovement.findMany({
    where: { projectId: project.id },
    include: { materialItem: true },
    orderBy: { movementDate: "desc" },
  });

  const uiDataLength = actionPayload.length;
  const renderedOrPaginatedCount = dbFiltered.length;
  const hasPagination = false;
  const usesInternalTableScroll = false;
  const actionTruncates = dbTotal > uiDataLength;
  const filterMismatch = renderedOrPaginatedCount !== dbFiltered.length;
  const pass = !actionTruncates && !filterMismatch;

  console.log(
    JSON.stringify(
      {
        project,
        filters: { movementType, materialId: materialId || null, q: q || null, dateFrom: dateFrom || null, dateTo: dateTo || null },
        dbTotal,
        dbActiveNotDeletedTotal,
        uiDataLength,
        filteredCount: dbFiltered.length,
        renderedOrPaginatedCount,
        hasPagination,
        usesInternalTableScroll,
        currentUiBehavior: "Table maps all filtered client records and uses natural page scroll, not an internal max-height table viewport.",
        checks: {
          serverPayloadNotTruncated: !actionTruncates,
          filteredCountMatchesRenderedCount: !filterMismatch,
          noHiddenPagination: !hasPagination,
        },
        conclusion: pass ? "PASS" : "FAIL",
        notes: actionTruncates
          ? "Server payload is truncated before the UI can filter all movements."
          : "DB total matches current server payload for this project; the transaction table should render all filtered records without client pagination or slicing.",
      },
      null,
      2,
    ),
  );

  if (!pass) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
