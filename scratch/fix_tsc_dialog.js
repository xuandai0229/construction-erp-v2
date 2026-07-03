const fs = require("fs"); 
let c = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8"); 

c = c.replace("import { useState, useEffect, useCallback } from \\"react\\";", "import React, { useState, useEffect, useCallback, Fragment } from \\"react\\";");
c = c.replace("weeklyPreview?.approvedCount === 0", "weeklyPreview?.stats?.approvedReports === 0");
c = c.replace(/stats: preview\\.stats \|\| \\{/g, "stats: preview.stats as any || {");

// replace React.Fragment
c = c.replace(/React\\.Fragment/g, "Fragment");

fs.writeFileSync("src/components/reports/create-report-dialog.tsx", c);

