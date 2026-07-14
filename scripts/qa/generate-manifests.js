const fs = require('fs');
const path = require('path');

const srcAppPath = path.join(__dirname, '../../src/app');
const srcComponentsPath = path.join(__dirname, '../../src/components');

// Helper to recursively find files
function findFiles(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFiles(file, ext));
        } else if (file.endsWith(ext)) {
            results.push(file);
        }
    });
    return results;
}

// 1. Generate Route Manifest
const pageFiles = findFiles(srcAppPath, 'page.tsx');
let routeManifest = '| Route | File |\n|---|---|\n';
pageFiles.forEach(file => {
    let route = file.replace(srcAppPath, '').replace(/\\/g, '/').replace('/page.tsx', '') || '/';
    routeManifest += `| ${route} | ${file.replace(srcAppPath, 'src/app')} |\n`;
});

console.log("=== ROUTE MANIFEST ===");
console.log(routeManifest);

// 2. Component Inventory (simplified)
const compFiles = findFiles(srcComponentsPath, '.tsx');
let compInventory = '| Component | Path |\n|---|---|\n';
compFiles.forEach(file => {
    let comp = path.basename(file, '.tsx');
    let relPath = file.replace(srcComponentsPath, 'src/components').replace(/\\/g, '/');
    compInventory += `| ${comp} | ${relPath} |\n`;
});

console.log("=== COMPONENT INVENTORY ===");
console.log(compInventory);
