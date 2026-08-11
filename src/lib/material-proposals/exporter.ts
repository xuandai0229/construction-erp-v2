import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs/promises";

export type MaterialProposalExport = {
  proposalNo: string;
  projectNameSnapshot: string;
  projectLocationSnapshot?: string | null;
  requesterNameSnapshot: string;
  requesterRoleSnapshot?: string | null;
  proposalDate: Date;
  purchaseReason?: string | null;
  requiredDeliveryDate?: Date | null;
  items: Array<{
    sequence: number;
    sectionName?: string | null;
    materialName: string;
    unit: string;
    contractQuantityText?: string | null;
    actualQuantity: number | string;
    specification?: string | null;
    manufacturerOrigin?: string | null;
    note?: string | null;
  }>;
};

const templatePath = path.join(process.cwd(), "src", "templates", "material-proposal-golden.xlsx");
const fmtDate = (date: Date | null | undefined) => (date ? new Date(date).toLocaleDateString("vi-VN") : "Chưa nhập");
const fmtHeaderDate = (date: Date) =>
  `Hà Nội, Ngày ${String(date.getDate()).padStart(2, "0")} tháng ${String(date.getMonth() + 1).padStart(2, "0")} năm ${date.getFullYear()}`;

export async function renderMaterialProposalExcel(proposal: MaterialProposalExport) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await fs.readFile(templatePath)) as any);
  const sheet = workbook.getWorksheet("kl");
  if (!sheet) throw new Error("Golden template thiếu sheet kl");

  // Capture template row styles before clearing
  const itemRowHeight = sheet.getRow(10).height || 22;
  const sectionRowHeight = sheet.getRow(23).height || 22;
  const footerRowHeight = sheet.getRow(31).height || 24;
  const signatureRowHeight = sheet.getRow(32).height || 45;

  const itemStyles = Array.from({ length: 8 }, (_, i) => ({ ...sheet.getRow(10).getCell(i + 1).style }));
  const sectionStyles = Array.from({ length: 8 }, (_, i) => ({ ...sheet.getRow(23).getCell(i + 1).style }));

  // Set header metadata
  sheet.getCell("F3").value = fmtHeaderDate(proposal.proposalDate);
  sheet.getCell("A4").value = `Tên công trình: ${proposal.projectNameSnapshot}`;
  sheet.getCell("A5").value = `Địa điểm: ${proposal.projectLocationSnapshot || "—"}`;
  sheet.getCell("A6").value = `Người yêu cầu: ${proposal.requesterNameSnapshot}${
    proposal.requesterRoleSnapshot ? `, thuộc ${proposal.requesterRoleSnapshot}.` : "."
  }`;
  sheet.getCell("A7").value = `Lý do mua hàng: ${proposal.purchaseReason || "—"}`;

  // Unmerge any merges in the sample body/footer area (from row 10 downwards)
  const mergesToUnmerge: string[] = [];
  if ((sheet as any)._merges) {
    Object.values((sheet as any)._merges).forEach((model: any) => {
      const top = model?.top ?? model?.tl ? parseInt(model.tl.replace(/[^0-9]/g, ""), 10) : 0;
      if (top >= 10 || (model?.range && parseInt(model.range.match(/\d+/)?.[0] || "0", 10) >= 10)) {
        mergesToUnmerge.push(model.range || `${model.tl}:${model.br}`);
      }
    });
  }
  mergesToUnmerge.forEach((range) => {
    try {
      sheet.unMergeCells(range);
    } catch {}
  });

  // Clear all sample rows from row 10 to max row
  const maxRow = Math.max(sheet.rowCount, 100);
  for (let r = 10; r <= maxRow; r++) {
    const row = sheet.getRow(r);
    row.values = [];
    row.height = itemRowHeight;
  }

  // Build rows array from proposal items
  const rows: Array<{ type: "item" | "section"; item?: MaterialProposalExport["items"][number]; section?: string }> = [];
  let previousSection: string | null = null;
  for (const item of proposal.items) {
    const section = item.sectionName?.trim() || null;
    if (section && section !== previousSection) rows.push({ type: "section", section });
    rows.push({ type: "item", item });
    previousSection = section;
  }

  let rowNumber = 10;
  let seq = 1;
  for (const rowData of rows) {
    const row = sheet.getRow(rowNumber);
    const isSection = rowData.type === "section";
    const styleSource = isSection ? sectionStyles : itemStyles;
    row.height = isSection ? sectionRowHeight : itemRowHeight;

    for (let col = 1; col <= 8; col++) {
      row.getCell(col).style = { ...styleSource[col - 1] };
    }

    if (isSection) {
      row.getCell(2).value = rowData.section;
      for (const col of [1, 3, 4, 5, 6, 7, 8]) row.getCell(col).value = null;
    } else {
      const item = rowData.item!;
      row.getCell(1).value = item.sequence || seq;
      row.getCell(2).value = item.materialName;
      row.getCell(3).value = item.unit;
      row.getCell(4).value = item.contractQuantityText || "";
      row.getCell(5).value = Number(item.actualQuantity) || item.actualQuantity;
      row.getCell(6).value = item.specification || "";
      row.getCell(7).value = item.manufacturerOrigin || "";
      row.getCell(8).value = item.note || "";

      // Ensure proper horizontal & vertical alignments
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      row.getCell(7).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      row.getCell(8).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

      seq++;
    }
    rowNumber++;
  }

  // Insert Delivery Date Footer
  const footerRow = rowNumber + 1;
  const footer = sheet.getRow(footerRow);
  footer.height = footerRowHeight;
  sheet.mergeCells(`A${footerRow}:H${footerRow}`);
  const footerCell = sheet.getCell(`A${footerRow}`);
  footerCell.value = `Ngày cấp về công trình: ${fmtDate(proposal.requiredDeliveryDate)}`;
  footerCell.font = { name: "Times New Roman", size: 11, italic: true, bold: true };
  footerCell.alignment = { horizontal: "left", vertical: "middle" };

  // Insert Signature Block
  const sigTitleRow = footerRow + 2;
  const sigRow = sheet.getRow(sigTitleRow);
  sigRow.height = signatureRowHeight;

  sheet.mergeCells(`A${sigTitleRow}:C${sigTitleRow}`);
  sheet.mergeCells(`D${sigTitleRow}:E${sigTitleRow}`);
  sheet.mergeCells(`F${sigTitleRow}:H${sigTitleRow}`);

  const cellA = sheet.getCell(`A${sigTitleRow}`);
  cellA.value = "NGƯỜI ĐỀ NGHỊ\n(ký, ghi rõ họ tên)";
  cellA.font = { name: "Times New Roman", size: 11, bold: true };
  cellA.alignment = { horizontal: "center", vertical: "top", wrapText: true };

  const cellD = sheet.getCell(`D${sigTitleRow}`);
  cellD.value = "PHÒNG KỸ THUẬT\n(ký, ghi rõ họ tên)";
  cellD.font = { name: "Times New Roman", size: 11, bold: true };
  cellD.alignment = { horizontal: "center", vertical: "top", wrapText: true };

  const cellF = sheet.getCell(`F${sigTitleRow}`);
  cellF.value = "PHÓ GIÁM ĐỐC\n(ký, ghi rõ họ tên)";
  cellF.font = { name: "Times New Roman", size: 11, bold: true };
  cellF.alignment = { horizontal: "center", vertical: "top", wrapText: true };

  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(new Uint8Array(output));
}

export function safeProposalFilename(proposalNo: string) {
  return `De-xuat-vat-tu_${proposalNo.replace(/[^a-zA-Z0-9._-]/g, "-")}.xlsx`;
}
