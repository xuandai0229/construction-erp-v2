"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSupplierPermissions, SupplierPermissionSet } from "@/lib/suppliers/suppliers-permissions";

const SUPPLIERS_PATH = "/suppliers";

// ========================
// DTOs
// ========================
export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  contractCount: number;
  createdAt: string;
  updatedAt: string;
}

// ========================
// Helpers
// ========================
function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function normalizeTaxCode(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text.replace(/\s+/g, "") : null;
}

function toSupplierDto(supplier: {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  _count?: { contracts: number };
  createdAt: Date;
  updatedAt: Date;
}): SupplierDto {
  return {
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    taxCode: supplier.taxCode,
    address: supplier.address,
    phone: supplier.phone,
    email: supplier.email,
    contactPerson: supplier.contactPerson,
    contractCount: supplier._count?.contracts ?? 0,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

function codeBaseFromName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 18);

  return slug || "NCC";
}

async function buildUniqueSupplierCode(name: string) {
  const base = `NCC-${codeBaseFromName(name)}`;

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? base : `${base}-${String(index + 1).padStart(2, "0")}`;
    const existing = await prisma.supplier.findUnique({
      where: { code: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  return `${base}-${Date.now()}`;
}

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Bạn cần đăng nhập để thao tác");
  return session;
}

function assertPermission(permissions: SupplierPermissionSet, action: keyof SupplierPermissionSet) {
  if (!permissions[action]) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
}

// ========================
// Get permissions for current user
// ========================
export async function getSupplierPermissionsForUser(): Promise<SupplierPermissionSet> {
  const session = await getSession();
  if (!session) return getSupplierPermissions();
  return getSupplierPermissions(session.role);
}

// ========================
// List all suppliers
// ========================
export async function getSuppliers(): Promise<SupplierDto[]> {
  const session = await getSession();
  if (!session) return [];

  const perms = getSupplierPermissions(session.role);
  if (!perms.canView) return [];

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { contracts: true } },
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });

  return suppliers.map(toSupplierDto);
}

// ========================
// Create supplier
// ========================
export async function createSupplier(data: {
  code?: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}) {
  const session = await requireSession();
  const perms = getSupplierPermissions(session.role);
  assertPermission(perms, "canCreate");

  const name = normalizeText(data.name);
  if (!name) throw new Error("Tên đối tác là bắt buộc");
  if (name.length > 200) throw new Error("Tên đối tác không được vượt quá 200 ký tự");

  const requestedCode = normalizeText(data.code).toUpperCase();
  if (requestedCode && requestedCode.length > 50) throw new Error("Mã đối tác không được vượt quá 50 ký tự");
  const code = requestedCode || (await buildUniqueSupplierCode(name));

  const taxCode = normalizeTaxCode(data.taxCode);
  if (taxCode) {
    if (taxCode.length > 30) throw new Error("Mã số thuế không được vượt quá 30 ký tự");
    const existing = await prisma.supplier.findFirst({
      where: { taxCode, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new Error("Mã số thuế đã tồn tại trong danh sách đối tác.");
  }

  const phone = normalizeOptionalText(data.phone);
  if (phone && phone.length > 30) throw new Error("Số điện thoại không được vượt quá 30 ký tự");

  const email = normalizeOptionalText(data.email)?.toLowerCase();
  if (email && email.length > 254) throw new Error("Email không được vượt quá 254 ký tự");

  try {
    await prisma.supplier.create({
      data: {
        code,
        name,
        taxCode,
        address: normalizeOptionalText(data.address),
        phone,
        email,
        contactPerson: normalizeOptionalText(data.contactPerson),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Mã đối tác đã tồn tại");
    }
    throw error;
  }

  revalidatePath(SUPPLIERS_PATH);
  return { ok: true };
}

// ========================
// Update supplier
// ========================
export async function updateSupplier(id: string, data: {
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}) {
  const session = await requireSession();
  const perms = getSupplierPermissions(session.role);
  assertPermission(perms, "canUpdate");

  const name = normalizeText(data.name);
  if (!name) throw new Error("Tên đối tác là bắt buộc");
  if (name.length > 200) throw new Error("Tên đối tác không được vượt quá 200 ký tự");

  const taxCode = normalizeTaxCode(data.taxCode);
  if (taxCode) {
    if (taxCode.length > 30) throw new Error("Mã số thuế không được vượt quá 30 ký tự");
    const existing = await prisma.supplier.findFirst({
      where: { taxCode, id: { not: id }, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new Error("Mã số thuế đã tồn tại trong danh sách đối tác.");
  }

  const phone = normalizeOptionalText(data.phone);
  if (phone && phone.length > 30) throw new Error("Số điện thoại không được vượt quá 30 ký tự");

  const email = normalizeOptionalText(data.email)?.toLowerCase();
  if (email && email.length > 254) throw new Error("Email không được vượt quá 254 ký tự");

  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!supplier) throw new Error("Đối tác không tồn tại");

  await prisma.supplier.update({
    where: { id },
    data: {
      name,
      taxCode,
      address: normalizeOptionalText(data.address),
      phone,
      email,
      contactPerson: normalizeOptionalText(data.contactPerson),
    },
  });

  revalidatePath(SUPPLIERS_PATH);
  return { ok: true };
}

// ========================
// Delete supplier (soft)
// ========================
export async function deleteSupplier(id: string) {
  const session = await requireSession();
  const perms = getSupplierPermissions(session.role);
  assertPermission(perms, "canDelete");

  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { contracts: true, paymentRequests: true } } },
  });
  if (!supplier) throw new Error("Đối tác không tồn tại");

  if (supplier._count.contracts > 0) {
    throw new Error("Không thể xóa đối tác đang có hợp đồng liên kết.");
  }
  if (supplier._count.paymentRequests > 0) {
    throw new Error("Không thể xóa đối tác đang có thanh toán liên kết.");
  }

  // Soft delete
  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(SUPPLIERS_PATH);
  return { ok: true };
}
