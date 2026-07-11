import fs from "fs";
import path from "path";
import { strict as assert } from "assert";

function main() {
  console.log("=== Bắt đầu QA: Creatable Combobox Value Sync ===");

  const comboboxPath = path.resolve(process.cwd(), "src/components/ui/enterprise-combobox.tsx");
  const code = fs.readFileSync(comboboxPath, "utf-8");

  try {
    // ============================================================
    // BUG 1: Custom option click MUST call onChange(trimmedQuery)
    // Before fix: onClick only called onCreateOption?.(trimmedQuery)
    // which was a no-op when onCreateOption was undefined.
    // ============================================================
    
    // The custom option onClick handler must contain onChange(trimmedQuery)
    // Find the showCreateOption button's onClick
    const customClickBlock = code.match(/showCreateOption \? \(\s*<button[\s\S]*?onClick=\{[\s\S]*?\}/);
    assert.ok(customClickBlock, "Must have showCreateOption button with onClick");
    const customClickCode = customClickBlock[0];
    
    // Must call onChange(trimmedQuery) BEFORE onCreateOption
    const onChangeInClick = customClickCode.indexOf("onChange(trimmedQuery)");
    const onCreateInClick = customClickCode.indexOf("onCreateOption?.(trimmedQuery)");
    assert.ok(onChangeInClick !== -1, "Custom click must call onChange(trimmedQuery)");
    assert.ok(onCreateInClick !== -1, "Custom click must call onCreateOption as side-effect");
    assert.ok(onChangeInClick < onCreateInClick, "onChange must be called BEFORE onCreateOption");
    console.log("  ✅ BUG 1 FIX VERIFIED: Custom click calls onChange() first");

    // ============================================================
    // BUG 2: Enter key on custom option MUST call onChange(trimmedQuery)
    // ============================================================
    const enterBlock = code.match(/event\.key === "Enter"[\s\S]*?showCreateOption\) \{([\s\S]*?)\}/);
    assert.ok(enterBlock, "Must have Enter key handler with showCreateOption branch");
    const enterCode = enterBlock[1];
    assert.ok(enterCode.includes("onChange(trimmedQuery)"), "Enter key must call onChange(trimmedQuery)");
    console.log("  ✅ BUG 2 FIX VERIFIED: Enter key calls onChange() for custom");

    // ============================================================
    // BUG 3: commitOnBlur must use refs to avoid stale closure
    // ============================================================
    assert.ok(code.includes("queryRef.current"), "Must use queryRef to avoid stale closure on blur");
    assert.ok(code.includes("onChangeRef.current"), "Must use onChangeRef to avoid stale closure");
    console.log("  ✅ BUG 3 FIX VERIFIED: Refs used for stale closure prevention");

    // ============================================================
    // Display: custom value not in options must still render
    // ============================================================
    assert.ok(
      code.includes("|| (allowCustom && value ? { value, label: value }"),
      "Must fallback render custom value on the button when value not in options"
    );
    console.log("  ✅ DISPLAY FIX VERIFIED: Custom value renders on button");

    // ============================================================
    // No lowercase/uppercase coercion on custom values
    // ============================================================
    // onChange should be called with trimmedQuery, not trimmedQuery.toLowerCase()
    assert.ok(!code.includes("onChange(trimmedQuery.toLowerCase()"), "Must NOT lowercase custom text");
    assert.ok(!code.includes("onChange(trimmedQuery.toUpperCase()"), "Must NOT uppercase custom text");
    console.log("  ✅ LANGUAGE SAFETY VERIFIED: No case coercion");

    // ============================================================
    // Material form dialog verification
    // ============================================================
    const materialFormPath = path.resolve(process.cwd(), "src/components/materials/material-form-dialog.tsx");
    const materialFormCode = fs.readFileSync(materialFormPath, "utf-8");

    assert.ok(materialFormCode.includes("allowCustom={true}"), "Form must enable allowCustom");
    assert.ok(materialFormCode.includes("commitOnBlur={true}"), "Form must enable commitOnBlur");
    assert.ok(materialFormCode.includes('customOptionLabel={(query) => `Dùng nhóm mới: "${query}"`}'), "Must show 'Dùng nhóm mới' label");
    
    // onChange must call updateField("group", val)
    assert.ok(
      materialFormCode.includes('onChange={(val) => updateField("group", val)}'),
      "onChange must set form.group via updateField"
    );
    console.log("  ✅ MATERIAL FORM VERIFIED: Props correct, onChange sets group");

    console.log("\n✅ TẤT CẢ ASSERTIONS ĐÃ QUA!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
