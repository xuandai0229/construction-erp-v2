const fs = require('fs');

let toast = fs.readFileSync('src/components/ui/toast-context.tsx', 'utf8');

toast = toast.replace(
  'const [toasts, setToasts] = useState<Toast[]>([]);',
  `const [toasts, setToasts] = useState<Toast[]>([]);\n  const lastToastRef = React.useRef<{ message: string; time: number } | null>(null);`
);

toast = toast.replace(
  'const addToast = useCallback((message: string, type: ToastType) => {',
  `const addToast = useCallback((message: string, type: ToastType) => {
    const now = Date.now();
    // Deduplicate same message within 2 seconds
    if (lastToastRef.current && lastToastRef.current.message === message && now - lastToastRef.current.time < 2000) {
      return;
    }
    lastToastRef.current = { message, time: now };
`
);

toast = toast.replace(
  'setToasts((prev) => [...prev, { id, message, type }]);',
  'setToasts((prev) => [...prev.slice(-2), { id, message, type }]); // Keep max 3'
);

toast = toast.replace(
  'className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col gap-2 pointer-events-none"',
  'className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-2 pointer-events-none"'
);

toast = toast.replace(
  'animate-in slide-in-from-bottom-5 fade-in duration-300',
  'animate-in slide-in-from-top-5 fade-in duration-300'
);

fs.writeFileSync('src/components/ui/toast-context.tsx', toast);
