function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateQty(val: any) {
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) throw new Error("So luong khong hop le");
  return num;
}

export function validatePositiveQty(val: any, fieldName = "So luong de xuat") {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) throw new Error(`${fieldName} phai lon hon 0`);
  return num;
}

function validateDate(value: unknown, fieldName: string) {
  if (!value) throw new Error(`Vui long chon ${fieldName}`);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(`${fieldName} khong hop le`);
  return date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function validateMaterialRequestPayload(data: any) {
  const projectId = normalizeText(data?.projectId);
  if (!projectId) throw new Error("Vui long chon cong trinh");

  const requestDate = data?.requestDate ? validateDate(data.requestDate, "ngay de xuat") : new Date();
  const neededDate = validateDate(data?.neededDate, "ngay can vat tu");
  if (dateKey(neededDate) < dateKey(requestDate)) {
    throw new Error("Ngay can vat tu khong duoc nho hon ngay de xuat");
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error("Vui long them it nhat mot dong vat tu");
  }

  items.forEach((item: any, index: number) => {
    const line = `Dong ${index + 1}`;
    if (!normalizeText(item?.materialName)) throw new Error(`${line}: Ten vat tu la bat buoc`);
    if (!normalizeText(item?.unit)) throw new Error(`${line}: Don vi tinh la bat buoc`);
    const requestedQuantity = validatePositiveQty(item?.requestedQuantity, `${line}: So luong de xuat`);
    const issuedQuantity = validateQty(item?.issuedQuantity);
    const receivedQuantity = validateQty(item?.receivedQuantity);
    if (issuedQuantity > requestedQuantity) {
      throw new Error(`${line}: So luong da cap khong duoc lon hon so luong de xuat`);
    }
    if (receivedQuantity > issuedQuantity) {
      throw new Error(`${line}: So luong da nhan khong duoc lon hon so luong da cap`);
    }
  });

  return { projectId, requestDate, neededDate, items };
}

export function validateMaterialRequestProgressItems(itemsData: any[]) {
  if (!Array.isArray(itemsData) || itemsData.length === 0) {
    throw new Error("Vui long cap nhat it nhat mot dong vat tu");
  }

  itemsData.forEach((item: any, index: number) => {
    const line = normalizeText(item?.materialName) || `Dong ${index + 1}`;
    const reqQty = validatePositiveQty(item?.requestedQuantity, `${line}: So luong de xuat`);
    const issQty = validateQty(item?.issuedQuantity);
    const recvQty = validateQty(item?.receivedQuantity);
    if (issQty > reqQty) {
      throw new Error(`${line}: So luong da cap khong duoc lon hon so luong de xuat`);
    }
    if (recvQty > issQty) {
      throw new Error(`${line}: So luong da nhan khong duoc lon hon so luong da cap`);
    }
  });
}
