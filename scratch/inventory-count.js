const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../src/app');

function getRouteFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getRouteFiles(filePath));
    } else if (file === 'route.ts') {
      results.push(filePath);
    }
  });
  return results;
}

const files = getRouteFiles(appDir);

let totalLegacyRouteFiles = 0;
let totalV1RouteFiles = 0;
let totalOutsideApiRouteFiles = 0;

let legacyMethods = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
let v1Methods = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };

const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

const inventory = [];

files.forEach((file) => {
  const relPath = path.relative(appDir, file).replace(/\\/g, '/');
  const routePath = '/' + relPath.replace(/\/route\.ts$/, '');
  const content = fs.readFileSync(file, 'utf8');

  let match;
  const methods = [];
  const regex = new RegExp(methodRegex);
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }

  const isV1 = routePath.startsWith('/api/v1');
  const isLegacyApi = routePath.startsWith('/api/') && !isV1;
  const isOutsideApi = !routePath.startsWith('/api');

  if (isV1) totalV1RouteFiles++;
  else if (isLegacyApi) totalLegacyRouteFiles++;
  else totalOutsideApiRouteFiles++;

  methods.forEach((m) => {
    if (isV1) v1Methods[m] = (v1Methods[m] || 0) + 1;
    else legacyMethods[m] = (legacyMethods[m] || 0) + 1;
  });

  inventory.push({
    file: relPath,
    routePath,
    isV1,
    isLegacyApi,
    isOutsideApi,
    methods,
  });
});

console.log('=== CANONICAL INVENTORY SUMMARY ===');
console.log(`Total route.ts files: ${files.length}`);
console.log(`  - V1 (/api/v1/**): ${totalV1RouteFiles} files`);
console.log(`  - Legacy (/api/**): ${totalLegacyRouteFiles} files`);
console.log(`  - Outside /api: ${totalOutsideApiRouteFiles} files`);

const totalV1MethodsCount = Object.values(v1Methods).reduce((a, b) => a + b, 0);
const totalLegacyMethodsCount = Object.values(legacyMethods).reduce((a, b) => a + b, 0);

console.log(`\nHTTP Method Breakdown:`);
console.log(`V1 HTTP Methods (Total: ${totalV1MethodsCount}):`, v1Methods);
console.log(`Legacy HTTP Methods (Total: ${totalLegacyMethodsCount}):`, legacyMethods);
console.log(`Total Combined HTTP Methods: ${totalV1MethodsCount + totalLegacyMethodsCount}`);

fs.writeFileSync(
  path.join(__dirname, 'inventory-data.json'),
  JSON.stringify(inventory, null, 2)
);
