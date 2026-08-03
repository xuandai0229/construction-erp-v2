import assert from "node:assert/strict";
import test from "node:test";
import { validateDocumentUploadPolicy } from "./validation";

const settings = {
  maxUploadSizeMb: 50,
  allowedExtensions: "pdf, dwg, dxf, jpg, png",
  enforceNamingConvention: true,
};

test("accepts a file within the configured application-level size limit", () => {
  const result = validateDocumentUploadPolicy(
    { name: "ban_ve_thi_cong_tang_12.dwg", size: 50 * 1024 * 1024 },
    settings,
  );

  assert.equal(result.valid, true);
});

test("rejects a file above the configured application-level size limit", () => {
  const result = validateDocumentUploadPolicy(
    { name: "ban_ve_thi_cong_tang_12.dwg", size: 50 * 1024 * 1024 + 1 },
    settings,
  );

  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.reason, "size_limit");
});

test("still blocks dangerous extensions regardless of size", () => {
  const result = validateDocumentUploadPolicy(
    { name: "ban_ve_thi_cong.exe", size: 1024 },
    settings,
  );

  assert.equal(result.valid, false);
});
