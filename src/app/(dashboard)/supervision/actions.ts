"use server";

import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { addFinding, addPlanItem, addQuantityVerification, addVisit, addTransitionCheck, addProgressAssessment, createWeeklyPackage, transitionPackage, deleteSupervisionRecord, updateWeeklyPackage, updateVisit, updateQuantityVerification, updateTransitionCheck, updateProgressAssessment } from "@/lib/supervision/service";

async function actor() { const session = await getSession(); if (!session) throw new Error("Vui lòng đăng nhập."); return session; }
function refresh() { revalidatePath("/supervision"); revalidatePath("/supervision/journal"); revalidatePath("/supervision/weekly-reports"); revalidatePath("/supervision/findings"); revalidatePath("/dashboard"); }

export async function createSupervisionPackage(input: Parameters<typeof createWeeklyPackage>[1]) { const result = await createWeeklyPackage(await actor(), input); refresh(); return { id: result.id }; }

export async function updateSupervisionPackage(packageId: string, input: Parameters<typeof updateWeeklyPackage>[2]) { const result = await updateWeeklyPackage(await actor(), packageId, input); refresh(); return { ok: true }; }

export async function createSupervisionVisit(input: Parameters<typeof addVisit>[1]) { const result = await addVisit(await actor(), input); refresh(); return { id: result.id }; }
export async function updateSupervisionVisit(id: string, input: Parameters<typeof updateVisit>[2]) { const result = await updateVisit(await actor(), id, input); refresh(); return { ok: true }; }

export async function createSupervisionQuantityVerification(input: Parameters<typeof addQuantityVerification>[1]) { const result = await addQuantityVerification(await actor(), input); refresh(); return { id: result.id }; }
export async function updateSupervisionQuantityVerification(id: string, input: Parameters<typeof updateQuantityVerification>[2]) { const result = await updateQuantityVerification(await actor(), id, input); refresh(); return { ok: true }; }

export async function createSupervisionFinding(input: Parameters<typeof addFinding>[1]) { const result = await addFinding(await actor(), input); refresh(); return { id: result.id }; }

export async function createSupervisionPlanItem(input: Parameters<typeof addPlanItem>[1]) { const result = await addPlanItem(await actor(), input); refresh(); return { id: result.id }; }

export async function createSupervisionTransitionCheck(input: Parameters<typeof addTransitionCheck>[1]) { const result = await addTransitionCheck(await actor(), input); refresh(); return { id: result.id }; }
export async function updateSupervisionTransitionCheck(id: string, input: Parameters<typeof updateTransitionCheck>[2]) { const result = await updateTransitionCheck(await actor(), id, input); refresh(); return { ok: true }; }

export async function createSupervisionProgressAssessment(input: Parameters<typeof addProgressAssessment>[1]) { const result = await addProgressAssessment(await actor(), input); refresh(); return { id: result.id }; }
export async function updateSupervisionProgressAssessment(id: string, input: Parameters<typeof updateProgressAssessment>[2]) { const result = await updateProgressAssessment(await actor(), id, input); refresh(); return { ok: true }; }

export async function deleteSupervisionItem(table: "visit" | "transitionCheck" | "quantity" | "progressAssessment", recordId: string) { await deleteSupervisionRecord(await actor(), table, recordId); refresh(); return { ok: true }; }

export async function changeSupervisionPackageStatus(packageId: string, action: "submit" | "review" | "request_revision" | "resubmit" | "confirm" | "lock" | "cancel", reason?: string, idempotencyKey?: string) { const result = await transitionPackage(await actor(), packageId, action, reason, idempotencyKey); refresh(); return result; }
