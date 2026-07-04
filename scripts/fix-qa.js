const fs = require('fs');

let script = fs.readFileSync('scripts/qa-report-ui-data-flow.ts', 'utf8');

script = script.replace('import { PrismaClient } from "@prisma/client";', '');
script = script.replace('const prisma = new PrismaClient();', 'import prisma from "../src/lib/prisma";');

fs.writeFileSync('scripts/qa-report-ui-data-flow.ts', script);
