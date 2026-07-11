import * as fs from 'fs';
import * as path from 'path';

const formPath = path.join(process.cwd(), 'src/components/materials/material-form-dialog.tsx');
const content = fs.readFileSync(formPath, 'utf8');

let pass = true;

if (!content.includes('max-w-2xl')) {
  console.error('FAIL: Material form does not have the wider max-w-2xl width.');
  pass = false;
}

if (!content.includes('EditableCombobox')) {
  console.error('FAIL: Material form is not using EditableCombobox for the group field.');
  pass = false;
}

if (!content.includes('NumericInput')) {
  console.error('FAIL: Material form is not using NumericInput for quantities.');
  pass = false;
}

if (!content.includes('minStockLevel: ""')) {
  // It uses a ternary that resolves to "" if <= 0
  if (!content.includes('? initialData.minStockLevel.toString() : ""')) {
    console.error('FAIL: Material form minStockLevel default empty string policy not found.');
    pass = false;
  }
}

if (!content.includes('autoComplete="off"')) {
  console.error('FAIL: Material form is missing autoComplete="off".');
  pass = false;
}

if (pass) {
  console.log('PASS: Material Form end-to-end UX policy is compliant.');
} else {
  process.exit(1);
}
