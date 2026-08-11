"use client";

import React from "react";

export type DocumentViewProposalItem = {
  id?: string;
  sequence: number;
  sectionName?: string | null;
  materialName: string;
  unit: string;
  contractQuantityText?: string | null;
  actualQuantity: number | string;
  specification?: string | null;
  manufacturerOrigin?: string | null;
  note?: string | null;
};

export type DocumentViewProposal = {
  id: string;
  proposalNo: string;
  projectNameSnapshot: string;
  projectLocationSnapshot?: string | null;
  requesterNameSnapshot: string;
  requesterRoleSnapshot?: string | null;
  proposalDate: Date | string;
  purchaseReason?: string | null;
  requiredDeliveryDate?: Date | string | null;
  items: DocumentViewProposalItem[];
  approvals?: Array<{
    stage: string;
    status: string;
    approver?: { name: string; role: string } | null;
  }>;
};

export function MaterialProposalDocumentView({ proposal }: { proposal: DocumentViewProposal }) {
  const pDate = new Date(proposal.proposalDate);
  const dateLine = `Hà Nội, Ngày ${String(pDate.getDate()).padStart(2, "0")} tháng ${String(
    pDate.getMonth() + 1
  ).padStart(2, "0")} năm ${pDate.getFullYear()}`;

  const delivDate = proposal.requiredDeliveryDate ? new Date(proposal.requiredDeliveryDate) : null;
  const delivDateFormatted = delivDate
    ? `Ngày ${String(delivDate.getDate()).padStart(2, "0")} tháng ${String(delivDate.getMonth() + 1).padStart(
        2,
        "0"
      )} năm ${delivDate.getFullYear()}`
    : "—";

  // Group items into sections
  const rows: Array<{ type: "item" | "section"; item?: DocumentViewProposalItem; section?: string }> = [];
  let previousSection: string | null = null;
  for (const item of proposal.items) {
    const section = item.sectionName?.trim() || null;
    if (section && section !== previousSection) {
      rows.push({ type: "section", section });
    }
    rows.push({ type: "item", item });
    previousSection = section;
  }

  // Find approver names if present in approvals list
  const techApproval = proposal.approvals?.find((a) => a.stage === "TECHNICAL" && a.status === "APPROVED");
  const finalApproval = proposal.approvals?.find((a) => a.stage === "FINAL" && a.status === "APPROVED");

  let sequenceNum = 1;

  return (
    <div className="document-paper-content text-slate-900 text-[11pt] leading-relaxed">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        .document-paper-content {
          font-family: "Times New Roman", Times, serif;
          color: #0f172a;
        }

        .doc-header-grid {
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 1rem;
          text-align: center;
          margin-bottom: 1.25rem;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-top: 10px;
          margin-bottom: 14px;
          font-size: 10.5pt;
        }

        .doc-table thead {
          display: table-header-group;
        }

        .doc-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .doc-table th,
        .doc-table td {
          border: 1px solid #000000;
          padding: 6px 7px;
          vertical-align: middle;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .doc-table th {
          background-color: #f8fafc;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          font-size: 10pt;
          text-transform: uppercase;
        }

        .doc-signature-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          .doc-table th {
            background-color: transparent !important;
          }
        }
      `}</style>

      {/* Official Header - WITHOUT "Số: ..." per requirement */}
      <header className="doc-header-grid">
        <div className="text-center">
          <div className="font-bold uppercase text-[11pt]">
            CÔNG TY CP XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold uppercase text-[11pt]">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </div>
          <div className="font-bold text-[10.5pt] underline underline-offset-4">
            Độc lập - Tự do - Hạnh phúc
          </div>
          <div className="mt-1 italic text-[10.5pt] text-slate-700">{dateLine}</div>
        </div>
      </header>

      {/* Main Document Title */}
      <h1 className="text-center font-bold text-[15pt] uppercase tracking-wide my-4 text-slate-900">
        ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ
      </h1>

      {/* Document Metadata List */}
      <div className="space-y-1.5 text-[11pt] my-4 leading-relaxed">
        <p>
          <span className="font-bold">Kính gửi:</span> Ban Giám đốc Công ty
        </p>
        <p>
          <span className="font-bold">Tên công trình:</span> {proposal.projectNameSnapshot}
        </p>
        <p>
          <span className="font-bold">Địa điểm:</span> {proposal.projectLocationSnapshot || "—"}
        </p>
        <p>
          <span className="font-bold">Người yêu cầu:</span> {proposal.requesterNameSnapshot}
          {proposal.requesterRoleSnapshot ? `, thuộc ${proposal.requesterRoleSnapshot}.` : "."}
        </p>
        <p>
          <span className="font-bold">Lý do mua hàng:</span> {proposal.purchaseReason || "—"}
        </p>
      </div>

      {/* Material Items Table (Golden Template Exact Layout) */}
      <table className="doc-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: "5%" }}>
              STT
            </th>
            <th rowSpan={2} style={{ width: "27%" }}>
              TÊN VẬT TƯ / VẬT LIỆU
            </th>
            <th rowSpan={2} style={{ width: "7%" }}>
              ĐƠN VỊ
            </th>
            <th colSpan={2} style={{ width: "20%" }}>
              KHỐI LƯỢNG
            </th>
            <th rowSpan={2} style={{ width: "16%" }}>
              QUY CÁCH / THÔNG SỐ KỸ THUẬT
            </th>
            <th rowSpan={2} style={{ width: "14%" }}>
              HÃNG SẢN XUẤT / XUẤT XỨ
            </th>
            <th rowSpan={2} style={{ width: "11%" }}>
              GHI CHÚ
            </th>
          </tr>
          <tr>
            <th style={{ width: "10%" }}>THEO HỢP ĐỒNG</th>
            <th style={{ width: "10%" }}>THỰC TẾ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.type === "section") {
              return (
                <tr key={`sec-${idx}`} className="bg-slate-100/80 font-bold">
                  <td colSpan={8} className="px-3 py-2 text-left uppercase text-blue-900">
                    {row.section}
                  </td>
                </tr>
              );
            }

            const item = row.item!;
            const currentSeq = sequenceNum++;

            return (
              <tr key={item.id || `item-${idx}`}>
                <td className="text-center font-semibold">{currentSeq}</td>
                <td className="text-left font-bold whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
                  {item.materialName}
                </td>
                <td className="text-center">{item.unit}</td>
                <td className="text-center text-slate-700">{item.contractQuantityText || "—"}</td>
                <td className="text-center font-bold text-slate-900">{String(item.actualQuantity)}</td>
                <td className="text-left text-xs whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
                  {item.specification || "—"}
                </td>
                <td className="text-left text-xs whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
                  {item.manufacturerOrigin || "—"}
                </td>
                <td className="text-left text-xs whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
                  {item.note || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Delivery Date Line */}
      <div className="my-3 font-bold italic text-[11pt]">
        Ngày cấp về công trình: {delivDateFormatted}
      </div>

      {/* Signature Block */}
      <div className="doc-signature-block grid grid-cols-3 gap-4 text-center mt-8 pt-4">
        <div>
          <div className="font-bold uppercase text-[11pt]">NGƯỜI ĐỀ NGHỊ</div>
          <div className="italic text-[10pt] text-slate-600">(ký, ghi rõ họ tên)</div>
          <div className="h-20" />
          <div className="font-bold text-[11pt]">{proposal.requesterNameSnapshot}</div>
        </div>

        <div>
          <div className="font-bold uppercase text-[11pt]">PHÒNG KỸ THUẬT</div>
          <div className="italic text-[10pt] text-slate-600">(ký, ghi rõ họ tên)</div>
          <div className="h-20" />
          <div className="font-bold text-[11pt]">{techApproval?.approver?.name || ""}</div>
        </div>

        <div>
          <div className="font-bold uppercase text-[11pt]">PHÓ GIÁM ĐỐC</div>
          <div className="italic text-[10pt] text-slate-600">(ký, ghi rõ họ tên)</div>
          <div className="h-20" />
          <div className="font-bold text-[11pt]">{finalApproval?.approver?.name || ""}</div>
        </div>
      </div>
    </div>
  );
}
