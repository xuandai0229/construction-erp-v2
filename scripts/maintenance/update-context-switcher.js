const fs = require('fs');

const path = 'src/components/layout/global-project-context-switcher.tsx';
let content = fs.readFileSync(path, 'utf-8');

const regex = /  \/\/ Deduce project ID from route if applicable[\s\S]*?const selectedProject = projects\.find\(p => p\.id === displayProjectId\);/;

const newLogic = `  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Deduce project ID from route if applicable
  let routeProjectId: string | null = null;
  const projectMatch = pathname.match(/^\\/projects\\/([^\\/]+)/);
  const documentMatch = pathname.match(/^\\/documents\\/([^\\/]+)/);

  if (projectMatch && projectMatch[1] !== 'new') {
    routeProjectId = projectMatch[1];
  } else if (documentMatch && documentMatch[1] !== 'new') {
    routeProjectId = documentMatch[1];
  }

  let isRootGlobalRoute = false;
  if (pathname === '/documents' || pathname === '/projects') {
    isRootGlobalRoute = true;
  }

  // To prevent hydration mismatch, initial render strictly uses selectedProjectId (Server cookie state)
  // After mount, we override it based on the URL.
  const displayProjectId = mounted ? (isRootGlobalRoute ? null : (routeProjectId || selectedProjectId)) : selectedProjectId;

  const selectedProject = projects.find(p => p.id === displayProjectId);`;

content = content.replace(regex, newLogic);
fs.writeFileSync(path, content);
console.log("Updated context switcher");
