import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const map: Record<string, string> = {
  "Cong trinh Nha van phong ket hop can ho dich vu Tay Ho": "Công trình Nhà văn phòng kết hợp căn hộ dịch vụ Tây Hồ",
  "Cong ty Co phan Dau tu Tay Ho Xanh": "Công ty Cổ phần Đầu tư Tây Hồ Xanh",
  "So 88 duong Vo Chi Cong, phuong Xuan La, quan Tay Ho, Ha Noi": "Số 88 đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội",
  "Du an dan dung gom 02 tang ham, 09 tang noi va 01 tum ky thuat; mong coc khoan nhoi, ket cau be tong cot thep toan khoi, hoan thien van phong - can ho dich vu - MEP/PCCC - canh quan.": "Dự án dân dụng gồm 02 tầng hầm, 09 tầng nổi và 01 tum kỹ thuật; móng cọc khoan nhồi, kết cấu bê tông cốt thép toàn khối, hoàn thiện văn phòng - căn hộ dịch vụ - MEP/PCCC - cảnh quan.",
  "Ban giam doc - Pham Minh Duc": "Ban giám đốc - Phạm Minh Đức",
  "Nguyen Duc Anh - Giam doc du an": "Nguyễn Đức Anh - Giám đốc dự án",
  "Tran Quang Hieu - Chi huy truong": "Trần Quang Hiếu - Chỉ huy trưởng",
  "Le Minh Quan - Ky su hien truong": "Lê Minh Quân - Kỹ sư hiện trường",
  "Do Thu Ha - Ky su QS": "Đỗ Thu Hà - Kỹ sư QS",
  "Vu Mai Linh - Ke toan cong trinh": "Vũ Mai Linh - Kế toán công trình",
  "Hoang Van Phuc - Thu kho": "Hoàng Văn Phúc - Thủ kho",
  "Pham Ngoc Son - Can bo an toan": "Phạm Ngọc Sơn - Cán bộ an toàn",
  "Dai dien chu dau tu": "Đại diện chủ đầu tư",
  "Admin he thong co quyen kiem tra toan bo du an": "Admin hệ thống có quyền kiểm tra toàn bộ dự án",
  "Ban giam doc theo doi va phe duyet": "Ban giám đốc theo dõi và phê duyệt",
  "Giam doc du an phu trach tong extreme": "Giám đốc dự án phụ trách tổng thể",
  "Giam doc du an phu trach tong the": "Giám đốc dự án phụ trách tổng thể",
  "Chi huy truong dieu phoi hien truong": "Chỉ huy trưởng điều phối hiện trường",
  "Ky su hien truong phu trach nhat ky va khoi luong": "Kỹ sư hiện trường phụ trách nhật ký và khối lượng",
  "Ky su QS kiem tra khoi luong va ho so thanh toan": "Kỹ sư QS kiểm tra khối lượng và hồ sơ thanh toán",
  "Ke toan cong trinh theo doi hop dong va thanh toan": "Kế toán công trình theo dõi hợp đồng và thanh toán",
  "Thu kho quan ly thep va ximang": "Thủ kho quản lý thép và xi măng",
  "Can bo an toan kiem tra hien truong": "Cán bộ an toàn kiểm tra hiện trường",
  "Thu kho quan ly nhap xuat vat tu": "Thủ kho quản lý nhập xuất vật tư",
  "Can bo an toan HSE": "Cán bộ an toàn HSE",
  "01. Hop dong": "01. Hợp đồng",
  "02. Ban ve": "02. Bản vẽ",
  "03. Du toan": "03. Dự toán",
  "04. Nghiem thu": "04. Nghiệm thu",
  "05. Hoa don": "05. Hóa đơn",
  "06. Thanh toan": "06. Thanh toán",
  "07. Hinh anh hien truong": "07. Hình ảnh hiện trường",
  "08. Bao cao ngay": "08. Báo cáo ngày",
  "Ho so ban ve thiet ke thi cong (ban goc)": "Hồ sơ bản vẽ thiết kế thi công (bản gốc)",
  "Du toan chi phi xay dung - Ban hanh lan 1": "Dự toán chi phí xây dựng - Ban hành lần 1",
  "Hop dong thi cong va phu luc dinh kem": "Hợp đồng thi công và phụ lục đính kèm",
  "Ban ve shopdrawing thep tang ham": "Bản vẽ shopdrawing thép tầng hầm",
  "Nghiem thu cot thep va be tong mong": "Nghiệm thu cốt thép và bê tông móng",
  "Bien ban ban giao mat bang thi cong": "Biên bản bàn giao mặt bằng thi công",
  "So do to chuc cong truong": "Sơ đồ tổ chức công trường",
  "Bien phap thi cong mong coc": "Biện pháp thi công móng cọc",
  "Ke hoach an toan lao dong": "Kế hoạch an toàn lao động",
  "Ho so trinh duyet vat tu thep": "Hồ sơ trình duyệt vật tư thép",
  "Bien ban hop giao ban thang 1": "Biên bản họp giao ban tháng 1",
  "Thanh toan dot 1": "Thanh toán đợt 1",
  "Tap doan Hoa Phat - Chi nhanh Ha Noi": "Tập đoàn Hòa Phát - Chi nhánh Hà Nội",
  "Cong ty Xi mang Bim Son": "Công ty Xi măng Bỉm Sơn",
  "Tong cong ty Viglacera": "Tổng công ty Viglacera",
  "Cong ty CP Day cap dien Viet Nam - CADIVI": "Công ty CP Dây cáp điện Việt Nam - CADIVI",
  "Cong ty TNHH Son Jotun Viet Nam": "Công ty TNHH Sơn Jotun Việt Nam",
  "Cong ty TNHH Xay dung va Co dien Minh An": "Công ty TNHH Xây dựng và Cơ điện Minh An",
  "Cong ty CP Nhua Binh Minh": "Công ty CP Nhựa Bình Minh",
  "66 Nguyen Du, Hai Ba Trung, Ha Noi": "66 Nguyễn Du, Hai Bà Trưng, Hà Nội",
  "Thanh Hoa - VP Ha Noi": "Thanh Hóa - VP Hà Nội",
  "So 1 Thang Long, Ha Noi": "Số 1 Thăng Long, Hà Nội",
  "Kho Ha Dong, Ha Noi": "Kho Hà Đông, Hà Nội",
  "Kho Long Bien, Ha Noi": "Kho Long Biên, Hà Nội",
  "So 88 Vo Chi Cong, Tay Ho, Ha Noi": "Số 88 Võ Chí Công, Tây Hồ, Hà Nội",
  "Lo C2 KCN Tu Liem, Ha Noi": "Lô C2 KCN Từ Liêm, Hà Nội",
  "Van phong My Dinh, Ha Noi": "Văn phòng Mỹ Đình, Hà Nội",
  "Ong Vu Quoc Bao": "Ông Vũ Quốc Bảo",
  "Ba Nguyen Thu Trang": "Bà Nguyễn Thu Trang",
  "Ong Tran Minh An": "Ông Trần Minh An",
  "Ba Le Thi Hanh": "Bà Lê Thị Hạnh",
  "Ong Nguyen Tien Dat": "Ông Nguyễn Tiến Đạt",
  "Ba Pham Dieu Linh": "Bà Phạm Diệu Linh",
  "Ong Hoang Minh": "Ông Hoàng Minh",
  "Ba Do Mai Phuong": "Bà Đỗ Mai Phương",
  "Thep D10 Hoa Phat": "Thép D10 Hòa Phát",
  "Thep D16 Hoa Phat": "Thép D16 Hòa Phát",
  "Thep D20 Hoa Phat": "Thép D20 Hòa Phát",
  "Thep D25 Hoa Phat": "Thép D25 Hòa Phát",
  "Xi mang Bim Son PCB40": "Xi măng Bỉm Sơn PCB40",
  "Cat vang song Lo": "Cát vàng sông Lô",
  "Da 1x2": "Đá 1x2",
  "Gach AAC 600x200x100": "Gạch AAC 600x200x100",
  "Day dien Cadivi CV 2.5": "Dây điện Cadivi CV 2.5",
  "Day dien Cadivi CV 4.0": "Dây điện Cadivi CV 4.0",
  "Son lot Jotun Majestic": "Sơn lót Jotun Majestic",
  "Son lot/san phu Jotun": "Sơn lót/sơn phủ Jotun",
  "Ong uPVC D110 Binh Minh": "Ống uPVC D110 Bình Minh",
  "Ong cap nuoc PPR": "Ống cấp nước PPR",
  "Ong thoat nuoc uPVC": "Ống thoát nước uPVC",
  "Ong luon day dien": "Ống luồn dây điện",
  "Thep": "Thép",
  "Xi mang": "Xi măng",
  "Vat lieu roi": "Vật liệu rời",
  "Hoan thien": "Hoàn thiện",
  "Nha tam, kho bai": "Nhà tạm, kho bãi",
  "Son ba hoan thien": "Sơn bả hoàn thiện",
  "De xuat mua thep dot 1 phuc vu tang ham": "Đề xuất mua thép đợt 1 phục vụ tầng hầm",
  "De xuat mua xi mang va cat thang 4": "Đề xuất mua xi măng và cát tháng 4",
  "Cot thep mong va dam mong": "Cốt thép móng và dầm móng",
  "Nha cung cap giao thieu 12 tan D20": "Nhà cung cấp giao thiếu 12 tấn D20",
  "Vat tu MEP am san tang 3": "Vật tư MEP âm sàn tầng 3",
  "Thi cong thoat nuoc am san": "Thi công thoát nước âm sàn",
  "Thi cong ong/dau cho dien nhe": "Thi công ống/đầu chờ điện nhẹ",
  "Hop dong tong thau thi cong xay dung": "Hợp đồng tổng thầu thi công xây dựng",
  "Hop dong cung cap thep Hoa Phat": "Hợp đồng cung cấp thép Hòa Phát",
  "Hop dong be tong thuong pham": "Hợp đồng bê tông thương phẩm",
  "Hop dong thi cong MEP va PCCC": "Hợp đồng thi công MEP và PCCC",
  "Hop dong nhan cong hoan thien": "Hợp đồng nhân công hoàn thiện",
  "Dot 1 - Tam ung 10% hop dong tong thau": "Đợt 1 - Tạm ứng 10% hợp đồng tổng thầu",
  "Dot 2 - Hoan thanh coc va mong": "Đợt 2 - Hoàn thành cọc và móng",
  "Dot 3 - Hoan thanh tang ham": "Đợt 3 - Hoàn thành tầng hầm",
  "Dot 4 - Than tang 1 den tang 3": "Đợt 4 - Thân tầng 1 đến tầng 3",
  "Thanh toan vat tu thep dot 2": "Thanh toán vật tư thép đợt 2",
  "Tam ung nha thau MEP": "Tạm ứng nhà thầu MEP",
  "Can bo sung hoa don VAT va bien ban doi chieu khoi luong.": "Cần bổ sung hóa đơn VAT và biên bản đối chiếu khối lượng.",
  "Ho so seed phuc vu UAT module thanh toan.": "Hồ sơ seed phục vụ UAT module thanh toán.",
  "Thieu hoa don VAT ban goc va bien ban giao nhan dot 2": "Thiếu hóa đơn VAT bản gốc và biên bản giao nhận đợt 2",
  "Duyet de xuat mua thep dot 1": "Duyệt đề xuất mua thép đợt 1",
  "Da duyet mua theo tien do tang ham": "Đã duyệt mua theo tiến độ tầng hầm",
  "Duyet ho so thanh toan dot 3": "Duyệt hồ sơ thanh toán đợt 3",
  "Duyet bien ban nghiem thu cot thep san tang 2": "Duyệt biên bản nghiệm thu cốt thép sàn tầng 2",
  "Bo sung ho so VAT thanh toan thep dot 2": "Bổ sung hồ sơ VAT thanh toán thép đợt 2",
  "Duyet hop dong nhan cong hoan thien": "Duyệt hợp đồng nhân công hoàn thiện",
  "Duyet phat sinh chong tham bo sung khu ham B2": "Duyệt phát sinh chống thấm bổ sung khu hầm B2",
  "Ho so du dieu kien thanh toan": "Hồ sơ đủ điều kiện thanh toán",
  "Yeu cau bo sung hoa don VAT ban goc": "Yêu cầu bổ sung hóa đơn VAT bản gốc",
  "Tam dung do thay doi pham vi": "Tạm dừng do thay đổi phạm vi",
  "Tam ung dot 1": "Tạm ứng đợt 1",
  "Thanh toan tien coc khoan nhoi": "Thanh toán tiền cọc khoan nhồi",
  "Thanh toan thi cong mong": "Thanh toán thi công móng",
  "Thanh toan tang ham": "Thanh toán tầng hầm",
  "Da thanh toan theo tien do hop dong": "Đã thanh toán theo tiến độ hợp đồng",
  "Giao ban ban giam doc": "Giao ban ban giám đốc",
  "Hop dieu phoi hien truong": "Họp điều phối hiện trường",
  "Nghiem thu thep va be tong": "Nghiệm thu thép và bê tông",
  "Bao cao ngay va khoi luong": "Báo cáo ngày và khối lượng",
  "Ho so thanh toan": "Hồ sơ thanh toán",
  "Giao nhan vat tu thep, ximang": "Giao nhận vật tư thép, ximang",
  "Bao cao an toan lao dong": "Báo cáo an toàn lao động",
  "Bao cao tien do hang ngay.": "Báo cáo tiến độ hàng ngày.",
  "Bao cao tien do tuan 1.": "Báo cáo tiến độ tuần 1.",
  "Bao cao tien do thang.": "Báo cáo tiến độ tháng.",
  "Nghiem thu cot thep dam san": "Nghiệm thu cốt thép dầm sàn",
  "Kiem tra vat lieu dau vao": "Kiểm tra vật liệu đầu vào",
  "Kiem tra an toan lao dong": "Kiểm tra an toàn lao động",
  "Cong viec hien truong": "Công việc hiện trường",
  "Thi cong cot thep dam san khu truc A-D/1-5, nghiem thu noi bo dat yeu cau.": "Thi công cốt thép dầm sàn khu trục A-D/1-5, nghiệm thu nội bộ đạt yêu cầu.",
  "Duy tri thi cong theo ke hoach, phoi hop TVGS kiem tra vat lieu dau vao.": "Duy trì thi công theo kế hoạch, phối hợp TVGS kiểm tra vật liệu đầu vào.",
  "Thep D16/D20, xi mang PCB40, be tong thuong pham, ong dien am san.": "Thép D16/D20, xi măng PCB40, bê tông thương phẩm, ống điện âm sàn.",
  "Cac hang muc nghiem thu noi bo dat yeu cau, da luu bien ban va anh hien truong.": "Các hạng mục nghiệm thu nội bộ đạt yêu cầu, đã lưu biên bản và ảnh hiện trường.",
  "Nha cung cap giao thieu 12 tan thep D20 so voi ke hoach, da lap phieu cho bo sung.": "Nhà cung cấp giao thiếu 12 tấn thép D20 so với kế hoạch, đã lập phiếu chờ bổ sung.",
  "Mua lon lam giam nang suat, can che chan vat tu.": "Mưa lớn làm giảm năng suất, cần che chắn vật tư.",
  "Khong co su co nghiem trong.": "Không có sự cố nghiêm trọng.",
  "Bo sung vat tu theo tien do va xac nhan lich do be tong truoc 24h.": "Bổ sung vật tư theo tiến độ và xác nhận lịch đổ bê tông trước 24h.",
  "Chi huy truong: 06h30 ngay mai hop an toan truoc khi do be tong san tang 3.": "Chỉ huy trưởng: 06h30 ngày mai họp an toàn trước khi đổ bê tông sàn tầng 3.",
  "Ke toan: Ho so VAT thep dot 2 con thieu ban goc, nho thu kho kiem tra.": "Kế toán: Hồ sơ VAT thép đợt 2 còn thiếu bản gốc, nhờ thủ kho kiểm tra.",
  "Thu kho: Thep D20 giao thieu 12 tan, da lap bien ban cho NCC bo sung.": "Thủ kho: Thép D20 giao thiếu 12 tấn, đã lập biên bản cho NCC bổ sung.",
  "Giam doc du an: Dong y chuyen ca do be tong sang sang ngay mai do mua lon.": "Giám đốc dự án: Đồng ý chuyển ca đổ bê tông sang sáng ngày mai do mưa lớn.",
  "Cot thep mong, dam mong": "Cốt thép móng, dầm móng",
  "Cot thep cot/vach tang 1-3": "Cốt thép cột/vách tầng 1-3",
  "Cot thep san tang 1-3": "Cốt thép sàn tầng 1-3",
  "Cot thep tang 4": "Cốt thép tầng 4",
  "Mua lon buoi chieu, uu tien gia cong thep tai bai": "Mưa lớn buổi chiều, ưu tiên gia công thép tại bãi",
  "Thoi tiet phu hop thi cong": "Thời tiết phù hợp thi công",
  "cong nhan, 6 ky su, 2 can bo an toan": "công nhân, 6 kỹ sư, 2 cán bộ an toàn",
  "02 can cau thap, 01 may bom be tong, 03 may cat uon thep, 04 xe tron be tong": "02 cần cẩu tháp, 01 máy bơm bê tông, 03 máy cắt uốn thép, 04 xe trộn bê tông",
  "Anh hien truong kem bao cao": "Ảnh hiện trường kèm báo cáo",
  "Yeu cau phe duyet lien quan": "Yêu cầu phê duyệt liên quan",
  "QS: De nghi cap nhat khoi luong cot thep san tang 2 truoc 17h.": "QS: Đề nghị cập nhật khối lượng cốt thép sàn tầng 2 trước 17h."
};

function getFixed(text: string | null | undefined): string | null {
  if (!text) return null;
  // If the text is an exact match, replace it.
  const fixed = map[text];
  if (fixed && fixed !== text) return fixed;

  // We also try regex replace for things like "Bao cao hien truong ngay "
  if (text.startsWith("Bao cao hien truong ngay ")) {
    return text.replace("Bao cao hien truong ngay ", "Báo cáo hiện trường ngày ");
  }
  return null;
}

async function updateDb() {
  const PROJECT_CODE = "HN-TH-2026-001";
  console.log(`=== UPDATING VIETNAMESE DIACRITICS FOR ${PROJECT_CODE} ===`);
  let count = 0;
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (!project) {
    console.error("Project not found!");
    process.exit(1);
  }

  // Helper to log and update
  async function checkAndUpdate(model: any, id: string, data: Record<string, any>, label: string) {
    const toUpdate: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v) toUpdate[k] = v;
    }
    if (Object.keys(toUpdate).length > 0) {
      await model.update({ where: { id }, data: toUpdate });
      console.log(`[Update] ${label} (${id}): ${JSON.stringify(toUpdate)}`);
      count++;
    }
  }

  // Project
  await checkAndUpdate(prisma.project, project.id, {
    name: getFixed(project.name),
    investor: getFixed(project.investor),
    location: getFixed(project.location),
    description: getFixed(project.description)
  }, "Project");

  // ProjectMember (User)
  const members = await prisma.projectMember.findMany({ where: { projectId: project.id }, include: { user: true } });
  for (const m of members) {
    await checkAndUpdate(prisma.user, m.user.id, { name: getFixed(m.user.name) }, "User");
  }

  // DocumentFolder
  const folders = await prisma.documentFolder.findMany({ where: { projectId: project.id } });
  for (const f of folders) {
    await checkAndUpdate(prisma.documentFolder, f.id, { name: getFixed(f.name) }, "DocumentFolder");
  }

  // Document
  const docs = await prisma.document.findMany({ where: { projectId: project.id } });
  for (const d of docs) {
    await checkAndUpdate(prisma.document, d.id, { displayName: getFixed(d.displayName) }, "Document");
  }

  // MaterialItem
  const materials = await prisma.materialItem.findMany({ where: { projectId: project.id } });
  for (const m of materials) {
    await checkAndUpdate(prisma.materialItem, m.id, {
      name: getFixed(m.name),
      group: getFixed(m.group)
    }, "MaterialItem");
  }

  // MaterialRequest & Items
  const matReqs = await prisma.materialRequest.findMany({ where: { projectId: project.id } });
  for (const m of matReqs) {
    await checkAndUpdate(prisma.materialRequest, m.id, { note: getFixed(m.note) }, "MaterialRequest");
  }
  const matReqItems = await prisma.materialRequestItem.findMany({ where: { materialRequest: { projectId: project.id } } });
  for (const mi of matReqItems) {
    await checkAndUpdate(prisma.materialRequestItem, mi.id, {
      materialName: getFixed(mi.materialName),
      reason: getFixed(mi.reason)
    }, "MaterialRequestItem");
  }

  // MaterialMovement
  const movements = await prisma.materialMovement.findMany({ where: { projectId: project.id } });
  for (const m of movements) {
    await checkAndUpdate(prisma.materialMovement, m.id, { notes: getFixed(m.notes) }, "MaterialMovement");
  }

  // Supplier
  const suppliers = await prisma.supplier.findMany({});
  for (const s of suppliers) {
    await checkAndUpdate(prisma.supplier, s.id, {
      name: getFixed(s.name),
      address: getFixed(s.address),
      contactPerson: getFixed(s.contactPerson)
    }, "Supplier");
  }

  // Contract
  const contracts = await prisma.contract.findMany({ where: { projectId: project.id } });
  for (const c of contracts) {
    await checkAndUpdate(prisma.contract, c.id, { name: getFixed(c.name) }, "Contract");
  }

  // PaymentRequest
  const payments = await prisma.paymentRequest.findMany({ where: { projectId: project.id } });
  for (const p of payments) {
    await checkAndUpdate(prisma.paymentRequest, p.id, {
      title: getFixed(p.title),
      notes: getFixed(p.notes),
      rejectedReason: getFixed(p.rejectedReason)
    }, "PaymentRequest");
  }

  // PaymentPlan
  const plans = await prisma.paymentPlan.findMany({ where: { projectId: project.id } });
  for (const p of plans) {
    await checkAndUpdate(prisma.paymentPlan, p.id, { name: getFixed(p.name) }, "PaymentPlan");
  }

  // PaymentRecord
  const records = await prisma.paymentRecord.findMany({ where: { projectId: project.id } });
  for (const r of records) {
    await checkAndUpdate(prisma.paymentRecord, r.id, { notes: getFixed(r.notes) }, "PaymentRecord");
  }

  // ApprovalRequest
  const approvals = await prisma.approvalRequest.findMany({ where: { projectId: project.id } });
  for (const a of approvals) {
    await checkAndUpdate(prisma.approvalRequest, a.id, {
      title: getFixed(a.title),
      description: getFixed(a.description)
    }, "ApprovalRequest");
  }

  // SiteReport
  const reports = await prisma.siteReport.findMany({ where: { projectId: project.id } });
  for (const r of reports) {
    await checkAndUpdate(prisma.siteReport, r.id, {
      title: getFixed(r.title),
      summary: getFixed(r.summary),
      weatherNote: getFixed(r.weatherNote),
      materials: getFixed(r.materials),
      quality: getFixed(r.quality),
      issues: getFixed(r.issues),
      recommendations: getFixed(r.recommendations)
    }, "SiteReport");
  }

  // SiteReportLine
  const reportLines = await prisma.siteReportLine.findMany({ where: { siteReport: { projectId: project.id } } });
  for (const rl of reportLines) {
    await checkAndUpdate(prisma.siteReportLine, rl.id, {
      workContent: getFixed(rl.workContent),
      note: getFixed(rl.note)
    }, "SiteReportLine");
  }

  // FieldProgressItem
  const fieldItems = await prisma.fieldProgressItem.findMany({ where: { projectId: project.id } });
  for (const fi of fieldItems) {
    await checkAndUpdate(prisma.fieldProgressItem, fi.id, {
      categoryName: getFixed(fi.categoryName),
      workContent: getFixed(fi.workContent)
    }, "FieldProgressItem");
  }

  // ChatMessage
  const chats = await prisma.chatMessage.findMany({ where: { content: { contains: "HN-TH-2026-001" } } });
  for (const ch of chats) {
    // Manually run regex against chats just in case map doesn't match perfectly.
    let changed = false;
    let newContent = ch.content;
    for (const [k, v] of Object.entries(map)) {
      if (newContent.includes(k)) {
        newContent = newContent.replaceAll(k, v);
        changed = true;
      }
    }
    if (changed && newContent !== ch.content) {
      await checkAndUpdate(prisma.chatMessage, ch.id, { content: newContent }, "ChatMessage");
    }
  }

  console.log(`=== DONE. Total fields updated: ${count} ===`);
}

updateDb().catch(console.error).finally(() => prisma.$disconnect());
