import { FieldPolicyContext } from "./ai-field-policy";

export interface MaterialItemRawData {
  id: string;
  code: string;
  name: string;
  unit: string;
  description: string | null;
  manufacturer: string | null;
  origin: string | null;
  group: string | null;
  isActive: boolean;
}

export interface MaterialItemRoleSafeDTO {
  id: string;
  code: string;
  name: string;
  unit: string;
  description?: string;
  manufacturer?: string;
  origin?: string;
  group?: string;
}

export function applyMaterialFieldPolicy(
  rawItems: MaterialItemRawData[],
  _context: FieldPolicyContext
): MaterialItemRoleSafeDTO[] {
  return rawItems
    .filter((item) => item.isActive)
    .map((item) => {
      const dto: MaterialItemRoleSafeDTO = {
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
      };
      if (item.description) dto.description = item.description;
      if (item.manufacturer) dto.manufacturer = item.manufacturer;
      if (item.origin) dto.origin = item.origin;
      if (item.group) dto.group = item.group;
      return dto;
    });
}
