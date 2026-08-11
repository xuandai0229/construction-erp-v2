import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { renderMaterialProposalExcel } from "./exporter";

const item = (sequence: number, sectionName?: string) => ({ sequence, sectionName, materialName: `Vật tư ${sequence}`, unit: "mét", contractQuantityText: sequence === 1 ? "(43m)" : "", actualQuantity: sequence, specification: "Thông số", manufacturerOrigin: "Ngoài danh mục", note: "" });

describe("Golden material proposal exporter", () => {
  it("injects dynamic data and keeps Golden structural anchors", async () => {
    const buffer = await renderMaterialProposalExcel({ proposalNo: "DVT-TEST", projectNameSnapshot: "Công trình kiểm thử", projectLocationSnapshot: "Hà Nội", requesterNameSnapshot: "Người kiểm thử", requesterRoleSnapshot: "KỸ SƯ", proposalDate: new Date("2026-08-10"), purchaseReason: "Phục vụ kiểm thử", requiredDeliveryDate: new Date("2026-08-12"), items: [item(1), item(2, "Phần Điện nhẹ"), item(3, "Phần Điện nhẹ")] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet("kl")!;
    expect(sheet.getCell("A4").value).toBe("Tên công trình: Công trình kiểm thử");
    expect(sheet.getCell("A10").value).toBe(1);
    expect(sheet.getCell("C10").value).toBe("mét");
    expect(sheet.getCell("D10").value).toBe("(43m)");
    expect(sheet.getCell("B11").value).toBe("Phần Điện nhẹ");
    expect(sheet.getCell("A10").value).not.toBe("1");
    expect(sheet.getColumn(2).width).toBe(30);
    expect(sheet.getCell("A1").isMerged).toBe(true);
    const signatureRow = Array.from({ length: sheet.rowCount }, (_, index) => index + 1).find((row) => sheet.getCell(`A${row}`).value === "NGƯỜI ĐỀ NGHỊ\n(ký, ghi rõ họ tên)");
    expect(signatureRow).toBeDefined();
    expect(sheet.getCell(`A${signatureRow}`).isMerged).toBe(true);
  });

  it("supports many items without overwriting the signature block", async () => {
    const buffer = await renderMaterialProposalExcel({ proposalNo: "DVT-MANY", projectNameSnapshot: "Công trình dài", requesterNameSnapshot: "Người kiểm thử", proposalDate: new Date(), items: Array.from({ length: 100 }, (_, i) => item(i + 1)) });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet("kl")!;
    expect(sheet.getCell("A109").value).toBe(100);
    expect(sheet.getCell(`A${sheet.rowCount}`).value).toContain("NGƯỜI ĐỀ NGHỊ");
  });

  it("verifies zero sample data leakage from Golden template", async () => {
    const buffer = await renderMaterialProposalExcel({
      proposalNo: "DVT-CLEAN",
      projectNameSnapshot: "Công trình Sạch",
      requesterNameSnapshot: "Nguyễn Văn A",
      proposalDate: new Date(),
      items: [
        { sequence: 1, materialName: "Xi măng PCB40", unit: "bao", actualQuantity: 50, specification: "Bao 50kg", manufacturerOrigin: "Nghi Sơn" },
        { sequence: 2, materialName: "Ống nước Tiền Phong D90", unit: "cây", actualQuantity: 20, specification: "PVC C2", manufacturerOrigin: "Tiền Phong" },
      ],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet("kl")!;

    // Dump all cell string values
    const allCellTexts: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value) allCellTexts.push(String(cell.value));
      });
    });

    const forbiddenSampleTexts = ["Cadisun", "Trần Phú", "Sino", "Dây cáp", "Dây tiếp địa", "Ống luồn"];
    for (const forbidden of forbiddenSampleTexts) {
      const found = allCellTexts.some((txt) => txt.includes(forbidden));
      expect(found).toBe(false);
    }

    // Expect exactly our 2 items
    expect(sheet.getCell("B10").value).toBe("Xi măng PCB40");
    expect(sheet.getCell("B11").value).toBe("Ống nước Tiền Phong D90");

    // Signature row comes right after footer row
    const footerRow = sheet.getRow(13);
    expect(String(footerRow.getCell(1).value)).toContain("Ngày cấp về công trình");
    const sigRow = sheet.getRow(15);
    expect(String(sigRow.getCell(1).value)).toContain("NGƯỜI ĐỀ NGHỊ");
  });
});
