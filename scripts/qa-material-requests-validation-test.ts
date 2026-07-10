import { validateMaterialRequestPayload, validateMaterialRequestProgressItems } from "../src/lib/material-requests/validation";

function assertThrows(name: string, fn: () => void, expected: string) {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expected)) {
      throw new Error(`${name}: expected "${expected}", got "${message}"`);
    }
    console.log(`PASS ${name}`);
    return;
  }

  throw new Error(`${name}: expected an error`);
}

function assertPasses(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

assertThrows(
  "rejects request without needed date",
  () => validateMaterialRequestPayload({ projectId: "project-1", neededDate: "", items: [{ materialName: "Thep", unit: "kg", requestedQuantity: 1 }] }),
  "ngay can vat tu",
);

assertThrows(
  "rejects request without items",
  () => validateMaterialRequestPayload({ projectId: "project-1", neededDate: new Date(), items: [] }),
  "it nhat mot dong",
);

assertThrows(
  "rejects zero requested quantity",
  () => validateMaterialRequestPayload({ projectId: "project-1", neededDate: new Date(), items: [{ materialName: "Thep", unit: "kg", requestedQuantity: 0 }] }),
  "lon hon 0",
);

assertThrows(
  "rejects missing material name",
  () => validateMaterialRequestPayload({ projectId: "project-1", neededDate: new Date(), items: [{ materialName: "", unit: "kg", requestedQuantity: 1 }] }),
  "Ten vat tu",
);

assertThrows(
  "rejects received greater than issued",
  () => validateMaterialRequestProgressItems([{ id: "line-1", materialName: "Thep", requestedQuantity: 10, issuedQuantity: 3, receivedQuantity: 4 }]),
  "khong duoc lon hon so luong da cap",
);

assertPasses(
  "accepts valid draft request",
  () => validateMaterialRequestPayload({ projectId: "project-1", neededDate: new Date(), items: [{ materialName: "Thep", unit: "kg", requestedQuantity: 10 }] }),
);

assertPasses(
  "accepts valid progress quantities",
  () => validateMaterialRequestProgressItems([{ id: "line-1", materialName: "Thep", requestedQuantity: 10, issuedQuantity: 7, receivedQuantity: 7 }]),
);
