import React from 'react';
import { Calendar, CheckSquare, BarChart2 } from 'lucide-react';

const tabs = [
  { id: 'planning',   label: 'Planning',   Icon: Calendar },
  { id: 'execution',  label: 'Execution',  Icon: CheckSquare },
  { id: 'reporting',  label: 'Reports',    Icon: BarChart2 },
];

export default function BottomNav({ screen, setScreen }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ id, label, Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
