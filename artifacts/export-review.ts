import fs from 'fs';
const items = JSON.parse(fs.readFileSync('artifacts/safety-inventory-classified.json', 'utf-8'));
const review = items.filter((x: any) => x.action === 'REVIEW_REQUIRED');
fs.writeFileSync('artifacts/review-required.txt', review.map((r: any) => `${r.path} | matches: ${r.matches}`).join('\n'));
console.log(`Wrote ${review.length} review required items.`);
