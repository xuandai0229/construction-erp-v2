import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconColorTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet' | 'orange' | 'sky';

const toneMap = {
  blue: {
    bg: 'bg-blue-100/60 border-blue-200/60',
    icon: 'text-blue-600'
  },
  emerald: {
    bg: 'bg-emerald-100/60 border-emerald-200/60',
    icon: 'text-emerald-600'
  },
  amber: {
    bg: 'bg-amber-100/60 border-amber-200/60',
    icon: 'text-amber-600'
  },
  rose: {
    bg: 'bg-rose-100/60 border-rose-200/60',
    icon: 'text-rose-600'
  },
  slate: {
    bg: 'bg-slate-100 border-slate-100',
    icon: 'text-slate-600'
  },
  violet: {
    bg: 'bg-violet-100/60 border-violet-200/60',
    icon: 'text-violet-600'
  },
  orange: {
    bg: 'bg-orange-100/60 border-orange-200/60',
    icon: 'text-orange-600'
  },
  sky: {
    bg: 'bg-sky-100/60 border-sky-200/60',
    icon: 'text-sky-600'
  }
};

export function ExecutiveIcon({ 
  icon: Icon, 
  tone = 'slate',
  className
}: { 
  icon: LucideIcon; 
  tone?: IconColorTone;
  className?: string; 
}) {
  const styles = toneMap[tone];
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm", styles.bg, className)}>
      <Icon className={cn("h-5 w-5", styles.icon)} strokeWidth={2} />
    </div>
  );
}

export function ExecutiveSmallIcon({ 
  icon: Icon, 
  tone = 'slate',
  className
}: { 
  icon: LucideIcon; 
  tone?: IconColorTone;
  className?: string; 
}) {
  const styles = toneMap[tone];
  return (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border shadow-sm", styles.bg, className)}>
      <Icon className={cn("h-4 w-4", styles.icon)} strokeWidth={2} />
    </div>
  );
}
