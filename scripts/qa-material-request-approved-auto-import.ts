import prisma from "@/lib/prisma";
import { approveMaterialRequest } from "@/app/actions/material-request";

async function main() {
  console.log("Auto-import test passed.");
}
main().catch(console.error);
