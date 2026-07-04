const fs = require('fs');

let bell = fs.readFileSync('src/components/layout/global-notification-bell.tsx', 'utf8');

// Change Date to string | Date in the type
bell = bell.replace('createdAt: Date;', 'createdAt: Date | string;');

// Replace the usage
bell = bell.replace(
  /{notif.createdAt.toLocaleDateString\('vi-VN'\)} {notif.createdAt.toLocaleTimeString\('vi-VN', { hour: '2-digit', minute: '2-digit' }\)}/g,
  '{new Date(notif.createdAt).toLocaleDateString(\'vi-VN\')} {new Date(notif.createdAt).toLocaleTimeString(\'vi-VN\', { hour: \'2-digit\', minute: \'2-digit\' })}'
);

// There is another issue: "Z-index phải cao hơn header/sidebar nhưng không đè modal đang active sai cách"
// The panel has z-50. This is usually fine, but let's make it z-[60] just in case or keep it z-50.
bell = bell.replace(
  'absolute right-0 top-full z-50 mt-2',
  'absolute right-0 top-full z-[100] mt-2' // use z-100 to stay above things
);

fs.writeFileSync('src/components/layout/global-notification-bell.tsx', bell);
