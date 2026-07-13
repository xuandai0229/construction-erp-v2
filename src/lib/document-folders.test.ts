import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFolderAncestorChain,
  formatDocumentFolderName,
} from "./document-folders";

const folders = [
  { id: "root-1", parentId: null },
  { id: "child-1", parentId: "root-1" },
  { id: "grandchild-1", parentId: "child-1" },
  { id: "root-2", parentId: null },
];

test("maps technical system folder names to Vietnamese display labels", () => {
  assert.equal(formatDocumentFolderName("02_Ban_ve_Thiet_ke"), "02. Bản vẽ thiết kế");
  assert.equal(formatDocumentFolderName("03_Bien_ban_Nghiem_thu"), "03. Biên bản nghiệm thu");
  assert.equal(formatDocumentFolderName("ok_1"), "ok_1");
});

test("returns every ancestor id from root to direct parent", () => {
  assert.deepEqual(buildFolderAncestorChain(folders, "grandchild-1"), [
    "root-1",
    "child-1",
  ]);
  assert.deepEqual(buildFolderAncestorChain(folders, "child-1"), ["root-1"]);
  assert.deepEqual(buildFolderAncestorChain(folders, "root-2"), []);
});
