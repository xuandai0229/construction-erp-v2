import prisma from "../src/lib/prisma";
import { strict as assert } from "assert";

async function main() {
  const projectId = `proj-material-metadata-${Date.now()}`;
  let materialId = "";
  try {
    await prisma.project.create({ data: { id: projectId, code: `TEST-${Date.now()}`, name: "Công trình kiểm thử metadata vật tư" } });
    const material = await prisma.materialItem.create({ data: { projectId, code: `TEST-MAT-${Date.now()}`, name: "Vật tư kiểm thử", unit: "cái", manufacturer: "Hòa Phát", origin: "Việt Nam" } });
    materialId = material.id;
    assert.equal(material.manufacturer, "Hòa Phát");
    assert.equal(material.origin, "Việt Nam");
    const updated = await prisma.materialItem.update({ where: { id: material.id }, data: { manufacturer: "Vicem Hoàng Thạch", origin: "Việt Nam" } });
    assert.equal(updated.manufacturer, "Vicem Hoàng Thạch");
    assert.equal(updated.origin, "Việt Nam");
    console.log("Manufacturer/origin QA passed.");
  } finally {
    if (materialId) await prisma.materialItem.delete({ where: { id: materialId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  }
}
main();
