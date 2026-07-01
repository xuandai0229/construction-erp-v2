import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconColorTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet' | 'orange' | 'sky';

const toneMap = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/40 border-white/60 shadow-blue-900/5',
    icon: 'text-blue-600'
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-white/60 shadow-emerald-900/5',
    icon: 'text-emerald-600'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/40 border-white/60 shadow-amber-900/5',
    icon: 'text-amber-600'
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/40 border-white/60 shadow-rose-900/5',
    icon: 'text-rose-600'
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/40 border-white/60 shadow-slate-900/5',
    icon: 'text-slate-600'
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100/40 border-white/60 shadow-violet-900/5',
    icon: 'text-violet-600'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/40 border-white/60 shadow-orange-900/5',
    icon: 'text-orange-600'
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-50 to-sky-100/40 border-white/60 shadow-sky-900/5',
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
    <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl border shadow-sm", styles.bg, className)}>
      <Icon className={cn("h-[18px] w-[18px]", styles.icon)} strokeWidth={2} />
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
