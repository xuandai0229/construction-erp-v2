const fs = require('fs');

let notif = fs.readFileSync('src/components/layout/global-notification-bell.tsx', 'utf8');
notif = notif.replace('z-[80]', 'z-[60]');
fs.writeFileSync('src/components/layout/global-notification-bell.tsx', notif);

let search = fs.readFileSync('src/components/layout/global-search-command.tsx', 'utf8');
// It's already z-[70] from my previous replace, but let's make sure
fs.writeFileSync('src/components/layout/global-search-command.tsx', search);

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');
dialog = dialog.replace('className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"', 'className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"');
dialog = dialog.replace('className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"', 'className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-in fade-in"');
fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);

let picker = fs.readFileSync('src/components/reports/create-dialog/work-picker.tsx', 'utf8');
picker = picker.replace('className="fixed inset-0 z-[200] flex items-center justify-center', 'className="fixed inset-0 z-[85] flex items-center justify-center');
fs.writeFileSync('src/components/reports/create-dialog/work-picker.tsx', picker);
