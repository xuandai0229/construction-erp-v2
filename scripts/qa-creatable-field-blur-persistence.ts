import * as fs from 'fs';
import * as path from 'path';

const comboboxPath = path.join(process.cwd(), 'src/components/ui/editable-combobox.tsx');
const content = fs.readFileSync(comboboxPath, 'utf8');

let pass = true;

if (!content.includes('onBlur={handleBlur}')) {
  console.error('FAIL: EditableCombobox is missing onBlur handler for the input.');
  pass = false;
}

if (!content.includes('commitValue(v)')) {
  console.error('FAIL: EditableCombobox handleBlur is not committing the value.');
  pass = false;
}

if (pass) {
  console.log('PASS: Creatable field blur persistence policy is properly implemented via EditableCombobox.');
} else {
  process.exit(1);
}
