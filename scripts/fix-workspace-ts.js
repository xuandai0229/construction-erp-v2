const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');

file = file.replace(
  'import { Plus, AlertCircle, Clock, XCircle, FileEdit, CheckSquare, Filter, X } from "lucide-react";',
  'import { Plus, AlertCircle, Clock, XCircle, FileEdit, CheckSquare, Filter, X, FileText } from "lucide-react";'
);

const dashStart = file.indexOf('const dashboardStats = useMemo(() => {');
if (dashStart !== -1) {
  const dashEnd = file.indexOf('}, [currentUser.id, isLeader, reports, stats]);');
  if (dashEnd !== -1) {
    file = file.substring(0, dashStart) + file.substring(dashEnd + '}, [currentUser.id, isLeader, reports, stats]);'.length);
  }
}

file = file.replace(/const isLeader =.*?\n/g, '');

fs.writeFileSync('src/components/reports/reports-workspace.tsx', file);
