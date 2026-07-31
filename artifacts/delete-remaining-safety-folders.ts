import fs from 'fs';
import path from 'path';

const safetyDirs = [
  'src/app/(dashboard)/safety-inspection',
  'src/app/api/safety-inspection',
  'src/components/safety-inspection',
  'src/lib/safety-inspection'
];

function deleteFolderRecursive(folder: string) {
  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach((file) => {
      const curPath = path.join(folder, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folder);
  }
}

for (const d of safetyDirs) {
  deleteFolderRecursive(d);
  console.log(`Deleted folder: ${d}`);
}
