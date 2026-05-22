import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

const todayStr = () => new Date().toISOString().split('T')[0];

export default function DateBar({ selectedDate, onChange, loading }) {
  const isToday = selectedDate === todayStr();

  return (
    <div className="sticky top-[53px] z-20 bg-indigo-600 text-white px-3 py-2 shadow-md">
      <div className="max-w-lg mx-auto flex items-center gap-2">

        {/* Prev day */}
        <button
          onClick={() => onChange(addDays(selectedDate, -1))}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>

        {/* Date label — invisible input overlaid for native picker */}
        <div className="flex-1 relative select-none">
          <input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Select date"
          />
          <div className="text-center pointer-events-none">
            <p className="font-bold text-sm tracking-wide">{formatDate(selectedDate)}</p>
            <p className="text-[10px] text-indigo-200 mt-0.5">
              {isToday ? 'Today — tap to change' : 'Tap to change'}
            </p>
          </div>
        </div>

        {/* Next day */}
        <button
          onClick={() => onChange(addDays(selectedDate, +1))}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>

        {/* Today shortcut — only visible when not on today */}
        {!isToday && (
          <button
            onClick={() => onChange(todayStr())}
            className="text-xs font-bold bg-white text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap shadow-sm"
          >
            Today
          </button>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
