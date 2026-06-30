"use client";

import { useEffect, useState } from 'react';

export function ExecutiveLiveClock() {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    // Initial update
    updateTime();

    // Update every 30 seconds to save performance
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);

    function updateTime() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      const formattedParts = formatter.formatToParts(now);
      const partsMap = formattedParts.reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {} as Record<string, string>);

      // e.g. "Thứ Hai, 29/06/2026 • 08:45"
      const dateString = `${partsMap.weekday}, ${partsMap.day}/${partsMap.month}/${partsMap.year} • ${partsMap.hour}:${partsMap.minute}`;
      setTimeStr(dateString);
    }
  }, []);

  if (!timeStr) {
    return <span className="opacity-0">Đang tải thời gian...</span>;
  }

  return (
    <span>
      {timeStr} <span className="text-slate-300 mx-1.5">•</span> Cập nhật thời gian thực
    </span>
  );
}
