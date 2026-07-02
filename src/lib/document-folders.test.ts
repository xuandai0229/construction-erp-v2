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

test("maps system and legacy folder names to Vietnamese display labels", () => {
  assert.equal(formatDocumentFolderName("01_Hop_dong_Phap_ly"), "01. Hợp đồng pháp lý");
  assert.equal(formatDocumentFolderName("01_Hop_dong"), "01. Hợp đồng");
  assert.equal(formatDocumentFolderName("02_Phu_luc_hop_dong"), "02. Phụ lục hợp đồng");
  assert.equal(formatDocumentFolderName("03_Bao_lanh_Bao_hiem"), "03. Bảo lãnh bảo hiểm");
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
