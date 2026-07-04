const fs = require('fs');

let search = fs.readFileSync('src/components/layout/global-search-command.tsx', 'utf8');

// z-index to 70 and better backdrop
search = search.replace(
  'className="fixed inset-0 z-50 flex flex-col sm:block"',
  'className="fixed inset-0 z-[70] flex flex-col sm:block"'
);
search = search.replace(
  'className="fixed inset-0 bg-slate-900/15 transition-opacity"',
  'className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all"'
);
// scrollbar
search = search.replace(
  'className="max-h-[60vh] overflow-y-auto p-2"',
  'className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar"'
);

// event listener for close-overlays
search = search.replace(
  'setIsOpen((open) => !open);',
  'window.dispatchEvent(new Event("close-overlays")); setIsOpen((open) => !open);'
);
if (!search.includes('close-overlays')) {
  search = search.replace(
    'useEffect(() => {\n    const handleKeyDown',
    `useEffect(() => {
    const handleCloseOverlays = () => setIsOpen(false);
    window.addEventListener("close-overlays", handleCloseOverlays);
    return () => window.removeEventListener("close-overlays", handleCloseOverlays);
  }, []);

  useEffect(() => {\n    const handleKeyDown`
  );
}

// In the onClick of the button
search = search.replace(
  'onClick={() => setIsOpen(true)}',
  'onClick={() => { window.dispatchEvent(new Event("close-overlays")); setIsOpen(true); }}'
);

fs.writeFileSync('src/components/layout/global-search-command.tsx', search);


let bell = fs.readFileSync('src/components/layout/global-notification-bell.tsx', 'utf8');
if (!bell.includes('close-overlays')) {
  bell = bell.replace(
    'useEffect(() => {\n    if (!isOpen) return;',
    `useEffect(() => {
    const handleCloseOverlays = () => setIsOpen(false);
    window.addEventListener("close-overlays", handleCloseOverlays);
    return () => window.removeEventListener("close-overlays", handleCloseOverlays);
  }, []);

  useEffect(() => {\n    if (!isOpen) return;`
  );
}
// Button
bell = bell.replace(
  'onClick={() => setIsOpen((open) => !open)}',
  'onClick={() => { const willOpen = !isOpen; window.dispatchEvent(new Event("close-overlays")); setIsOpen(willOpen); }}'
);

fs.writeFileSync('src/components/layout/global-notification-bell.tsx', bell);
