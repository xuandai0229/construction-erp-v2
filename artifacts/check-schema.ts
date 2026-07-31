import fs from 'fs';
const lines = fs.readFileSync('prisma/schema.prisma', 'utf-8').split('\n');
lines.forEach((line, index) => {
  if (index < 1891 && line.toLowerCase().includes('safety')) {
    console.log(`${index + 1}: ${line}`);
  }
});
