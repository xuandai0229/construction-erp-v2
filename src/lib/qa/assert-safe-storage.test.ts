import { describe, it, expect } from "vitest";
import path from "path";
import { assertSafeStorage } from "../../../scripts/qa/assert-safe-storage";

describe("assertSafeStorage Guard Logic", () => {
  it("should fail when storage root contains path traversal '..'", async () => {
    await expect(assertSafeStorage("../storage_hack")).rejects.toThrow(
      /Path traversal \('\.\.'\) detected/
    );
  });

  it("should fail when storage root is system root directory", async () => {
    const rootDir = path.parse(process.cwd()).root;
    await expect(assertSafeStorage(rootDir)).rejects.toThrow(
      /cannot be a system root directory/
    );
  });

  it("should fail when storage root is identical to primary storage folder", async () => {
    const primaryFolder = path.join(process.cwd(), "storage");
    await expect(assertSafeStorage(primaryFolder)).rejects.toThrow(
      /cannot be identical to primary application storage directory/
    );
  });

  it("should fail when folder name lacks qa, e2e, or test identifier", async () => {
    const invalidFolder = path.join(process.cwd(), "my_custom_uploads");
    await expect(assertSafeStorage(invalidFolder)).rejects.toThrow(
      /must contain a recognized test keyword/
    );
  });

  it("should pass and create marker when storage root is valid isolated directory", async () => {
    const validFolder = path.join(process.cwd(), "storage_e2e_unit_test");
    const result = await assertSafeStorage(validFolder);
    expect(result.isSafe).toBe(true);
    expect(result.storageRoot).toBe(path.resolve(validFolder));
    expect(result.markerPath).toContain(".qa-e2e-storage-marker.json");
  });
});
