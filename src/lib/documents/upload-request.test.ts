import assert from "node:assert/strict";
import test from "node:test";
import { parseDocumentUploadRequest } from "./upload-request";

test("parses a raw streaming document upload request from URL and headers", () => {
  const request = new Request(
    "http://localhost/api/documents/upload?projectId=project-1&folderId=folder-1&fileName=ban%20ve%20A1.pdf&displayName=Ban%20ve%20A1.pdf&note=ban%20ve",
    {
      method: "POST",
      headers: {
        "content-type": "application/pdf",
        "content-length": String(512 * 1024 * 1024),
      },
    },
  );

  const metadata = parseDocumentUploadRequest(request);

  assert.equal(metadata.projectId, "project-1");
  assert.equal(metadata.folderId, "folder-1");
  assert.equal(metadata.originalName, "ban ve A1.pdf");
  assert.equal(metadata.requestedDisplayName, "Ban ve A1.pdf");
  assert.equal(metadata.note, "ban ve");
  assert.equal(metadata.contentType, "application/pdf");
  assert.equal(metadata.size, 512 * 1024 * 1024);
});

test("rejects missing or invalid upload metadata before reading the body", () => {
  assert.throws(
    () =>
      parseDocumentUploadRequest(
        new Request("http://localhost/api/documents/upload?projectId=p", {
          method: "POST",
          headers: { "content-length": "10" },
        }),
      ),
    /folderId/i,
  );

  assert.throws(
    () =>
      parseDocumentUploadRequest(
        new Request("http://localhost/api/documents/upload?projectId=p&folderId=f&fileName=../secret.pdf", {
          method: "POST",
          headers: { "content-length": "10" },
        }),
      ),
    /tên file/i,
  );
});
