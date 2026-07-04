import fs from 'fs';
import path from 'path';

async function traceUrl(url: string, cookie?: string) {
  const steps: any[] = [];
  let currentUrl = url;
  let loopDetected = false;
  const maxSteps = 10;
  
  for (let i = 0; i < maxSteps; i++) {
    const headers: Record<string, string> = {};
    if (cookie) headers['cookie'] = cookie;
    
    const res = await fetch(currentUrl, {
      method: 'GET',
      headers,
      redirect: 'manual'
    });
    
    const status = res.status;
    const location = res.headers.get('location');
    let nextUrl = location ? new URL(location, currentUrl).href : null;
    
    steps.push({ status, location: location || null });
    
    if (!nextUrl) break;
    
    // Check loop (if nextUrl has been visited before in this chain)
    if (url === nextUrl || steps.length > 2 && steps.some(s => s.location === location)) {
       // Wait, a better loop detection is checking if the exact URL is repeated
       // We can just keep going or break
    }
    currentUrl = nextUrl;
  }
  
  // Check exact loop
  const locations = steps.map(s => s.location).filter(Boolean);
  if (new Set(locations).size !== locations.length) {
    loopDetected = true;
  }
  
  return { url, steps, loopDetected };
}

async function main() {
  const urls = [
    'http://localhost:3000/',
    'http://localhost:3000/login',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/projects',
    'http://localhost:3000/reports'
  ];
  
  const testCookie = process.env.TEST_COOKIE || '';
  const results = [];
  
  for (const url of urls) {
    console.log(`Tracing: ${url}`);
    const noCookieResult = await traceUrl(url);
    console.log('No cookie:', JSON.stringify(noCookieResult.steps));
    results.push({ mode: 'no-cookie', ...noCookieResult });
    
    if (testCookie) {
      const cookieResult = await traceUrl(url, testCookie);
      console.log('With cookie:', JSON.stringify(cookieResult.steps));
      results.push({ mode: 'with-cookie', ...cookieResult });
    }
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'docs/qa/post-wipe-redirect-chain-trace-2026-07-03.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Trace saved.');
}

main().catch(console.error);
