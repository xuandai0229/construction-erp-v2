import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const runtimeRoots = ["src", "prisma/schema.prisma"];
const retiredRouteGuard = "src/proxy.ts";
const forbiddenRuntimePatterns = [
  /\bsupplier(s)?\b/i, /\bvendor(s)?\b/i, /\bcontract(orcontract|s)?\b/i, /\bappendix\b/i,
  /\bpayment(request|plan|record|s)?\b/i, /\baccountant\b/i, /\bdebt\b/i, /\breceivable\b/i,
  /\bpayable\b/i, /\badvance\b/i, /\binvoice\b/i, /\bsettlement\b/i,
  /nhà cung cấp/i, /nhà cung ứng/i, /hợp đồng/i, /phụ lục/i, /thanh toán/i,
  /đề nghị thanh toán/i, /công nợ/i, /tạm ứng/i, /thu hồi tạm ứng/i, /quyết toán/i, /hóa đơn/i,
  /\/suppliers\b/i, /\/contracts\b/i, /\/accounting\b/i, /\bsuppliers\./i, /\bcontracts\./i, /\bpayments\./i,
];

function files(path: string): string[] {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => files(join(path, entry.name)));
}

const offenders = runtimeRoots.flatMap(files).filter((file) => relative(root, file).replace(/\\/g, "/") !== retiredRouteGuard).flatMap((file) => {
  const content = readFileSync(file, "utf8");
  return forbiddenRuntimePatterns.filter((pattern) => pattern.test(content)).map((pattern) => `${relative(root, file)}: ${pattern}`);
});

for (const route of ["src/app/(dashboard)/suppliers", "src/app/(dashboard)/contracts", "src/app/(dashboard)/accounting"]) {
  assert.equal(existsSync(join(root, route)), false, `Deleted route folder still exists: ${route}`);
}
const proxySource = readFileSync(join(root, retiredRouteGuard), "utf8");
assert.match(proxySource, /RETIRED_ROUTE_PREFIXES/, "Proxy must explicitly protect retired routes before authentication redirects.");
assert.match(proxySource, /status:\s*404/, "Retired routes must return HTTP 404 from Proxy.");
assert.deepEqual(offenders, [], `Runtime references remain:\n${offenders.join("\n")}`);
console.log("PASS: runtime source and Prisma schema contain no Supplier/Contract/Payment module references.");
