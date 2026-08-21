export type WorkDefinition = {
  group: string;
  code: string;
  name: string;
  unit: string;
  designQuantity: number;
  crew: string;
};

export type MaterialDefinition = {
  code: string;
  name: string;
  unit: string;
  manufacturer: string;
  origin: string;
  group: string;
  importQuantity: number;
  unitPrice: number;
  minStock: number;
};

export type ConstructionProfile = {
  key: "BUILDING" | "INFRASTRUCTURE" | "MAINTENANCE";
  label: string;
  constructionType: "BUILDING" | "INFRASTRUCTURE" | "OTHER";
  locationLabels: [string, string, string];
  works: WorkDefinition[];
  materials: MaterialDefinition[];
};

const BUILDING: ConstructionProfile = {
  key: "BUILDING",
  label: "Công trình dân dụng",
  constructionType: "BUILDING",
  locationLabels: ["Khối nhà chính", "Tầng 1", "Khu vực thi công số 1"],
  works: [
    { group: "Chuẩn bị & phần ngầm", code: "CB-01", name: "Định vị tim trục và chuẩn bị mặt bằng", unit: "m²", designQuantity: 2400, crew: "Tổ trắc đạc - mặt bằng" },
    { group: "Chuẩn bị & phần ngầm", code: "M-01", name: "Thi công bê tông móng và giằng móng", unit: "m³", designQuantity: 680, crew: "Đội kết cấu số 1" },
    { group: "Kết cấu & xây trát", code: "KC-01", name: "Thi công kết cấu bê tông cốt thép thân", unit: "m³", designQuantity: 1450, crew: "Đội kết cấu số 2" },
    { group: "Kết cấu & xây trát", code: "XT-01", name: "Xây tường và trát hoàn thiện trong nhà", unit: "m²", designQuantity: 8600, crew: "Đội xây trát" },
    { group: "MEP & hoàn thiện", code: "MEP-01", name: "Lắp đặt hệ thống điện, cấp thoát nước và PCCC", unit: "m", designQuantity: 12800, crew: "Đội cơ điện MEP" },
    { group: "MEP & hoàn thiện", code: "HT-01", name: "Ốp lát, sơn bả và hoàn thiện kiến trúc", unit: "m²", designQuantity: 9200, crew: "Đội hoàn thiện" },
  ],
  materials: [
    { code: "THEP-D16", name: "Thép cây D16 CB400-V", unit: "kg", manufacturer: "Hòa Phát", origin: "Việt Nam", group: "Thép xây dựng", importQuantity: 95000, unitPrice: 16800, minStock: 18000 },
    { code: "XM-PCB40", name: "Xi măng PCB40", unit: "bao", manufacturer: "Vicem Hoàng Thạch", origin: "Việt Nam", group: "Xi măng", importQuantity: 4200, unitPrice: 92000, minStock: 700 },
    { code: "CAT-VANG", name: "Cát vàng đổ bê tông", unit: "m³", manufacturer: "Nhà cung cấp địa phương", origin: "Việt Nam", group: "Cốt liệu", importQuantity: 980, unitPrice: 465000, minStock: 160 },
    { code: "DA-1X2", name: "Đá dăm 1x2", unit: "m³", manufacturer: "Mỏ đá Kiện Khê", origin: "Hà Nam, Việt Nam", group: "Cốt liệu", importQuantity: 1250, unitPrice: 395000, minStock: 200 },
    { code: "GACH-AAC", name: "Gạch bê tông khí chưng áp AAC", unit: "viên", manufacturer: "Viglacera", origin: "Việt Nam", group: "Vật liệu xây", importQuantity: 48000, unitPrice: 14500, minStock: 8000 },
    { code: "DAY-CV25", name: "Dây điện Cadivi CV 2.5 mm²", unit: "m", manufacturer: "Cadivi", origin: "Việt Nam", group: "Điện", importQuantity: 18500, unitPrice: 14800, minStock: 3000 },
  ],
};

const INFRASTRUCTURE: ConstructionProfile = {
  key: "INFRASTRUCTURE",
  label: "Hạ tầng giao thông - thoát nước",
  constructionType: "INFRASTRUCTURE",
  locationLabels: ["Phân đoạn tuyến chính", "Đoạn Km0+000 - Km0+500", "Mũi thi công số 1"],
  works: [
    { group: "Chuẩn bị & nền đường", code: "HT-CB01", name: "Trắc đạc, rào chắn và tổ chức giao thông", unit: "m", designQuantity: 3200, crew: "Tổ trắc đạc - ATGT" },
    { group: "Chuẩn bị & nền đường", code: "HT-ND01", name: "Đào khuôn, xử lý nền và đắp đất K95", unit: "m³", designQuantity: 14800, crew: "Đội nền đường" },
    { group: "Thoát nước & kết cấu", code: "HT-TN01", name: "Lắp đặt cống thoát nước và hố ga kỹ thuật", unit: "m", designQuantity: 2850, crew: "Đội thoát nước" },
    { group: "Thoát nước & kết cấu", code: "HT-CP01", name: "Thi công cấp phối đá dăm loại I", unit: "m³", designQuantity: 7200, crew: "Đội cấp phối" },
    { group: "Mặt đường & hoàn thiện", code: "HT-BT01", name: "Thảm bê tông nhựa C12.5", unit: "tấn", designQuantity: 5100, crew: "Đội thảm bê tông nhựa" },
    { group: "Mặt đường & hoàn thiện", code: "HT-HV01", name: "Lát hè, bó vỉa, sơn kẻ và lắp biển báo", unit: "m²", designQuantity: 12600, crew: "Đội hoàn thiện hạ tầng" },
  ],
  materials: [
    { code: "CPDD-I", name: "Cấp phối đá dăm loại I", unit: "m³", manufacturer: "Mỏ đá Kiện Khê", origin: "Hà Nam, Việt Nam", group: "Nền móng", importQuantity: 6200, unitPrice: 375000, minStock: 900 },
    { code: "BTN-C125", name: "Bê tông nhựa chặt C12.5", unit: "tấn", manufacturer: "Trạm trộn Đông Anh", origin: "Hà Nội, Việt Nam", group: "Mặt đường", importQuantity: 3600, unitPrice: 1580000, minStock: 450 },
    { code: "ONG-D600", name: "Cống tròn BTCT D600", unit: "m", manufacturer: "Bê tông Chèm", origin: "Việt Nam", group: "Thoát nước", importQuantity: 1450, unitPrice: 1280000, minStock: 220 },
    { code: "BO-VIA", name: "Bó vỉa bê tông 18x53x100 cm", unit: "m", manufacturer: "Viglacera", origin: "Việt Nam", group: "Hè đường", importQuantity: 3800, unitPrice: 245000, minStock: 600 },
    { code: "GACH-HE", name: "Gạch terrazzo lát hè 400x400", unit: "m²", manufacturer: "Secoin", origin: "Việt Nam", group: "Hè đường", importQuantity: 9200, unitPrice: 215000, minStock: 1500 },
    { code: "SON-KEDUONG", name: "Sơn nhiệt dẻo phản quang kẻ đường", unit: "kg", manufacturer: "Joton", origin: "Việt Nam", group: "ATGT", importQuantity: 5800, unitPrice: 48500, minStock: 850 },
  ],
};

const MAINTENANCE: ConstructionProfile = {
  key: "MAINTENANCE",
  label: "Duy tu - bảo trì đô thị",
  constructionType: "OTHER",
  locationLabels: ["Khu vực quản lý", "Phân khu ưu tiên", "Tổ duy tu số 1"],
  works: [
    { group: "Khảo sát & xử lý ban đầu", code: "DT-KS01", name: "Khảo sát hiện trạng và khoanh vùng điểm hư hỏng", unit: "điểm", designQuantity: 420, crew: "Tổ khảo sát hiện trạng" },
    { group: "Khảo sát & xử lý ban đầu", code: "DT-TN01", name: "Nạo vét rãnh, hố ga và khơi thông thoát nước", unit: "m", designQuantity: 6800, crew: "Đội duy tu thoát nước" },
    { group: "Sửa chữa hạ tầng", code: "DT-MD01", name: "Sửa chữa cục bộ mặt đường và vá ổ gà", unit: "m²", designQuantity: 5200, crew: "Đội sửa chữa mặt đường" },
    { group: "Sửa chữa hạ tầng", code: "DT-HE01", name: "Thay thế gạch hè, bó vỉa và tấm đan hư hỏng", unit: "m²", designQuantity: 4600, crew: "Đội duy tu hè phố" },
    { group: "Cảnh quan & an toàn", code: "DT-CS01", name: "Chăm sóc cây xanh, thảm cỏ và vệ sinh cảnh quan", unit: "m²", designQuantity: 28500, crew: "Đội cây xanh cảnh quan" },
    { group: "Cảnh quan & an toàn", code: "DT-AT01", name: "Bổ sung chiếu sáng, biển báo và sơn kẻ", unit: "bộ", designQuantity: 680, crew: "Đội điện - an toàn đô thị" },
  ],
  materials: [
    { code: "BTN-NGUOI", name: "Bê tông nhựa nguội đóng bao", unit: "tấn", manufacturer: "Carboncor Việt Nam", origin: "Việt Nam", group: "Mặt đường", importQuantity: 480, unitPrice: 2850000, minStock: 80 },
    { code: "GACH-HE-DT", name: "Gạch block tự chèn lát hè", unit: "m²", manufacturer: "Viglacera", origin: "Việt Nam", group: "Hè đường", importQuantity: 5200, unitPrice: 198000, minStock: 800 },
    { code: "TAMDAN", name: "Tấm đan BTCT 1000x500x80 mm", unit: "tấm", manufacturer: "Bê tông Chèm", origin: "Việt Nam", group: "Thoát nước", importQuantity: 850, unitPrice: 315000, minStock: 120 },
    { code: "DAT-MAU", name: "Đất màu trồng cây đã xử lý", unit: "m³", manufacturer: "Nhà vườn Sóc Sơn", origin: "Hà Nội, Việt Nam", group: "Cảnh quan", importQuantity: 920, unitPrice: 285000, minStock: 140 },
    { code: "CO-NHUNG", name: "Cỏ nhung Nhật trồng thảm", unit: "m²", manufacturer: "Nhà vườn Văn Giang", origin: "Hưng Yên, Việt Nam", group: "Cảnh quan", importQuantity: 6800, unitPrice: 78000, minStock: 900 },
    { code: "DEN-LED", name: "Đèn LED đường phố 120W IP66", unit: "bộ", manufacturer: "Rạng Đông", origin: "Việt Nam", group: "Chiếu sáng", importQuantity: 420, unitPrice: 3250000, minStock: 60 },
  ],
};

export function selectConstructionProfile(projectName: string): ConstructionProfile {
  const normalized = projectName.toLowerCase();
  if (
    normalized.includes("trường") ||
    normalized.includes("trung tâm") ||
    normalized.includes("mầm non")
  ) {
    return BUILDING;
  }

  if (
    normalized.includes("duy tu") ||
    normalized.includes("bảo trì") ||
    normalized.includes("công viên") ||
    normalized.includes("quản lý")
  ) {
    return MAINTENANCE;
  }

  return INFRASTRUCTURE;
}

