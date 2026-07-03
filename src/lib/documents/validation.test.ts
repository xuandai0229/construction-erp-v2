import assert from "node:assert/strict";
import test from "node:test";
import { validateDocumentUploadPolicy } from "./validation";

const settings = {
  allowedExtensions: "pdf, dwg, dxf, jpg, png",
  enforceNamingConvention: true,
};

test("does not impose an application-level hard size limit for large drawings", () => {
  const result = validateDocumentUploadPolicy(
    { name: "ban_ve_thi_cong_tang_12.dwg", size: 8 * 1024 * 1024 * 1024 },
    settings,
  );

  assert.equal(result.valid, true);
});

test("still blocks dangerous extensions regardless of size", () => {
  const result = validateDocumentUploadPolicy(
    { name: "ban_ve_thi_cong.exe", size: 1024 },
    settings,
  );

  assert.equal(result.valid, false);
});
