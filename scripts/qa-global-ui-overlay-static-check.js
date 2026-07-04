const fs = require('fs');

console.log("--- QA GLOBAL UI OVERLAY STATIC CHECK ---");

function checkZIndex(file, componentName, expectedZIndex) {
  if (!fs.existsSync(file)) {
    console.log(`[FAIL] ${componentName} - File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(`z-${expectedZIndex}`) || content.includes(`z-[${expectedZIndex}]`)) {
    console.log(`[PASS] ${componentName} has z-index ${expectedZIndex}`);
  } else {
    console.log(`[FAIL] ${componentName} does not have expected z-index ${expectedZIndex}`);
  }
}

checkZIndex('src/components/layout/header.tsx', 'Mobile Sidebar Overlay', '50');
checkZIndex('src/components/layout/header.tsx', 'Header/Topbar', '60');
checkZIndex('src/components/layout/global-search-command.tsx', 'Global Search Backdrop', '65');
checkZIndex('src/components/layout/global-search-command.tsx', 'Global Search Panel', '75');
checkZIndex('src/components/layout/global-notification-bell.tsx', 'Notification Dropdown', '80');
checkZIndex('src/components/reports/create-report-dialog.tsx', 'Report Dialog Modal', '80');
checkZIndex('src/components/ui/toast-context.tsx', 'Toast System', '100');

console.log("\nChecking for incorrect absolute/fixed overlays covering header...");
const searchContent = fs.readFileSync('src/components/layout/global-search-command.tsx', 'utf8');
if (searchContent.includes('className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all"')) {
  console.log("[FAIL] Global search backdrop still covers the whole screen (including header).");
} else {
  console.log("[PASS] Global search backdrop no longer covers the header.");
}

console.log("\nChecking window.confirm in Report Dialog...");
const dialogContent = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');
if (dialogContent.includes('window.confirm')) {
  console.log("[FAIL] Report dialog uses window.confirm.");
} else {
  console.log("[PASS] Report dialog does not use window.confirm.");
}

console.log("\n--- STATIC CHECK COMPLETED ---");
