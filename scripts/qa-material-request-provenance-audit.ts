import fs from "fs";
import path from "path";

async function main() {
  console.log("Running qa-material-request-provenance-audit...");
  
  const uiPath = path.join(process.cwd(), "src/components/materials/material-detail-drawer.tsx");
  const uiCode = fs.readFileSync(uiPath, "utf8");

  if (uiCode.includes("{material.description}")) {
    throw new Error("UI still renders raw material.description which may contain metadata.");
  }

  console.log("Provenance audit passed.");
}

main().catch(console.error);
