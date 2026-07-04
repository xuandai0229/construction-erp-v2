const fs = require('fs');

let search = fs.readFileSync('src/components/layout/global-search-command.tsx', 'utf8');

search = search.replace(
  '{isOpen && (\n        <div className="fixed inset-0 z-[70] flex flex-col sm:block">\n          <div \n            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all" \n            aria-hidden="true"\n          />\n          <div \n            ref={panelRef}\n            className="relative w-full max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 mt-2 mx-2 sm:mx-auto sm:mt-[72px] animate-in fade-in zoom-in-95 duration-200"\n          >',
  `{isOpen && (
        <>
          <div 
            className="fixed inset-x-0 bottom-0 top-16 z-[65] bg-slate-900/30 backdrop-blur-sm transition-all" 
            aria-hidden="true"
          />
          <div 
            ref={panelRef}
            className="fixed z-[75] w-[calc(100%-1rem)] max-w-[800px] left-1/2 -translate-x-1/2 top-[72px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200"
          >`
);

// close the fragment instead of div
search = search.replace(
  '</div>\n        </div>\n      )}',
  '</div>\n        </>\n      )}'
);

fs.writeFileSync('src/components/layout/global-search-command.tsx', search);


let notif = fs.readFileSync('src/components/layout/global-notification-bell.tsx', 'utf8');
notif = notif.replace('z-[60]', 'z-[80]');
fs.writeFileSync('src/components/layout/global-notification-bell.tsx', notif);
