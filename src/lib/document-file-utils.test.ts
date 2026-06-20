import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocumentDisplayName,
  getDocumentPreviewKind,
  hasAllowedDocumentExtension,
  isPoorDocumentFileName,
} from "./document-file-utils";

test("classifies browser-safe images and PDFs for inline preview", () => {
  assert.equal(getDocumentPreviewKind("image/jpeg", ".jpg"), "image");
  assert.equal(getDocumentPreviewKind("image/webp", ".webp"), "image");
  assert.equal(getDocumentPreviewKind("application/pdf", ".pdf"), "pdf");
});

test("uses details fallback for HEIC, Office, CAD and XML files", () => {
  assert.equal(getDocumentPreviewKind("image/heic", ".heic"), "details");
  assert.equal(
    getDocumentPreviewKind(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".docx",
    ),
    "details",
  );
  assert.equal(getDocumentPreviewKind("application/acad", ".dwg"), "details");
  assert.equal(getDocumentPreviewKind("application/xml", ".xml"), "details");
});

test("preserves the original extension while accepting a clean display name", () => {
  assert.equal(
    buildDocumentDisplayName("Hop dong chinh 2026", ".pdf"),
    "Hop dong chinh 2026.pdf",
  );
  assert.equal(
    buildDocumentDisplayName("Hop dong chinh 2026.PDF", ".pdf"),
    "Hop dong chinh 2026.pdf",
  );
});

test("rejects unsafe names and extension changes", () => {
  assert.throws(
    () => buildDocumentDisplayName("../secret", ".pdf"),
    /không hợp lệ/i,
  );
  assert.throws(
    () => buildDocumentDisplayName("bang-ke.xlsx", ".pdf"),
    /phần mở rộng/i,
  );
  assert.throws(
    () => buildDocumentDisplayName("", ".pdf"),
    /không được để trống/i,
  );
});

test("flags common camera, chat and generic file names without blocking clean names", () => {
  assert.equal(
    isPoorDocumentFileName(
      "z7196297014877_d01b47c42e4e360830f9a3d65542e204.jpg",
    ),
    true,
  );
  assert.equal(isPoorDocumentFileName("CV.pdf"), true);
  assert.equal(isPoorDocumentFileName("IMG_20260620_143012.jpg"), true);
  assert.equal(isPoorDocumentFileName("HD_12-2026_19062026.pdf"), false);
});

test("checks legacy files against folder extension rules case-insensitively", () => {
  assert.equal(hasAllowedDocumentExtension(".PDF", [".pdf", ".docx"]), true);
  assert.equal(hasAllowedDocumentExtension(".wav", [".pdf", ".docx"]), false);
});
