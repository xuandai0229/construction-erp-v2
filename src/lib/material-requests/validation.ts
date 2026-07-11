function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateQty(val: any) {
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) throw new Error("Số lượng không hợp lệ");
  return num;
}

export function validatePositiveQty(val: any, fieldName = "Số lượng đề xuất") {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) throw new Error(`${fieldName} phai lon hon 0`);
  return num;
}

function validateDate(value: unknown, fieldName: string) {
  if (!value) throw new Error(`Vui lòng chọn ${fieldName}`);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(`${fieldName} không hợp lệ`);
  return date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function validateMaterialRequestPayload(data: any) {
  const projectId = normalizeText(data?.projectId);
  if (!projectId) throw new Error("Vui lòng chọn công trình");

  const requestDate = data?.requestDate ? validateDate(data.requestDate, "ngày đề xuất") : new Date();
  const neededDate = validateDate(data?.neededDate, "ngày cần vật tư");
  if (dateKey(neededDate) < dateKey(requestDate)) {
    throw new Error("Ngày cần vật tư không được nhỏ hơn ngày đề xuất");
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error("Vui lòng thêm ít nhất một dòng vật tư");
  }

  items.forEach((item: any, index: number) => {
    const line = `Dòng ${index + 1}`;
    if (!normalizeText(item?.materialName)) throw new Error(`${line}: Tên vật tư là bắt buộc`);
    if (!normalizeText(item?.unit)) throw new Error(`${line}: Đơn vị tính là bắt buộc`);
    const requestedQuantity = validatePositiveQty(item?.requestedQuantity, `${line}: Số lượng đề xuất`);
    const issuedQuantity = validateQty(item?.issuedQuantity);
    const receivedQuantity = validateQty(item?.receivedQuantity);
    if (issuedQuantity > requestedQuantity) {
      throw new Error(`${line}: Số lượng đã cấp không được lớn hơn số lượng đề xuất`);
    }
    if (receivedQuantity > issuedQuantity) {
      throw new Error(`${line}: Số lượng đã nhận không được lớn hơn số lượng đã cấp`);
    }
  });

  return { projectId, requestDate, neededDate, items };
}

export function validateMaterialRequestProgressItems(itemsData: any[]) {
  if (!Array.isArray(itemsData) || itemsData.length === 0) {
    throw new Error("Vui lòng cập nhật ít nhất một dòng vật tư");
  }

  itemsData.forEach((item: any, index: number) => {
    const line = normalizeText(item?.materialName) || `Dòng ${index + 1}`;
    const reqQty = validatePositiveQty(item?.requestedQuantity, `${line}: Số lượng đề xuất`);
    const issQty = validateQty(item?.issuedQuantity);
    const recvQty = validateQty(item?.receivedQuantity);
    if (issQty > reqQty) {
      throw new Error(`${line}: Số lượng đã cấp không được lớn hơn số lượng đề xuất`);
    }
    if (recvQty > issQty) {
      throw new Error(`${line}: Số lượng đã nhận không được lớn hơn số lượng đã cấp`);
    }
  });
}
