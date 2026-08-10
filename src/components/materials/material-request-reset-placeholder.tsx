'use client';

import React from 'react';
import { Package } from 'lucide-react';

export function MaterialRequestResetPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center p-12 my-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
        <Package className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">
        Đề xuất vật tư
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Phân hệ đang được xây dựng lại.
      </p>
    </div>
  );
}
