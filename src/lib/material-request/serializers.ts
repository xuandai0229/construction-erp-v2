export function serializeMaterialRequestItem(item: any) {
  if (!item) return item;
  return {
    ...item,
    requestedQuantity: Number(item.requestedQuantity || 0),
    issuedQuantity: Number(item.issuedQuantity || 0),
    receivedQuantity: Number(item.receivedQuantity || 0),
    remainingQuantity: Number(item.remainingQuantity || 0),
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    deletedAt: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
    materialRequest: item.materialRequest ? serializeMaterialRequest(item.materialRequest) : undefined,
  };
}

export function serializeMaterialRequest(req: any) {
  if (!req) return req;
  return {
    ...req,
    requestDate: req.requestDate ? new Date(req.requestDate).toISOString() : null,
    neededDate: req.neededDate ? new Date(req.neededDate).toISOString() : null,
    createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null,
    updatedAt: req.updatedAt ? new Date(req.updatedAt).toISOString() : null,
    deletedAt: req.deletedAt ? new Date(req.deletedAt).toISOString() : null,
    items: req.items ? req.items.map(serializeMaterialRequestItem) : undefined,
  };
}
