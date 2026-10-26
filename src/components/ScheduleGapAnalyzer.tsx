import React from 'react';
import { CalendarRange, Sparkles, Check, Clock, CalendarDays } from 'lucide-react';
import { Task } from '../types';

interface ScheduleGapAnalyzerProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
}

export function ScheduleGapAnalyzer({ tasks, onUpdateTasks }: ScheduleGapAnalyzerProps) {
  const activeFocusTasks = tasks.filter(t => !t.completed && t.focusBlocks.length > 0);
  const unscheduledCriticalTasks = tasks.filter(t => !t.completed && t.focusBlocks.length === 0 && t.urgencyScore >= 7.0);

  // Auto block focus time slots for highly critical tasks
  const handleAutoFillGaps = async () => {
    if (unscheduledCriticalTasks.length === 0) {
      alert("No unscheduled critical tasks need auto-filling right now!");
      return;
    }

    const updatedTasks = [...tasks];
    let slotsUsed = 0;
    
    // Mock hour allocation starting from 13:00 (1 PM) onwards
    const startingHour = 14; 
    
    for (let i = 0; i < updatedTasks.length; i++) {
      const task = updatedTasks[i];
      if (!task.completed && task.focusBlocks.length === 0 && task.urgencyScore >= 7.0) {
        const slotHour = startingHour + slotsUsed;
        if (slotHour >= 21) break; // don't book past 9 PM
        
        const blockString = `Today ${slotHour}:00 - ${slotHour}:30`;
        task.focusBlocks.push(blockString);
        slotsUsed++;

        // Save on server
        try {
          await fetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    onUpdateTasks(updatedTasks);
  };

  const hours = [
    { label: '09:00 AM', block: null },
    { label: '10:00 AM', block: null },
    { label: '11:00 AM', block: null },
    { label: '12:00 PM', block: 'Lunch break' },
    { label: '01:00 PM', block: null },
    { label: '02:00 PM', block: null },
    { label: '03:00 PM', block: null },
    { label: '04:00 PM', block: null },
    { label: '05:00 PM', block: null },
    { label: '06:00 PM', block: null },
  ];

  // Map tasks into their active slots
  activeFocusTasks.forEach(task => {
    task.focusBlocks.forEach(block => {
      // Parse hour e.g. "Today 14:00 - 14:30" -> 14 is "02:00 PM"
      const match = block.match(/Today (\d+):/);
      if (match) {
        const hVal = parseInt(match[1]);
        let index = -1;
        if (hVal === 9) index = 0;
        else if (hVal === 10) index = 1;
        else if (hVal === 11) index = 2;
        else if (hVal === 12) index = 3;
        else if (hVal === 13) index = 4;
        else if (hVal === 14) index = 5;
        else if (hVal === 15) index = 6;
        else if (hVal === 16) index = 7;
        else if (hVal === 17) index = 8;
        else if (hVal === 18) index = 9;

        if (index !== -1 && !hours[index].block) {
          hours[index].block = task.title;
        }
      }
    });
  });

  return (
    <div id="schedule-analyzer-card" className="border-2 border-black dark:border-[#3F3F46] bg-white dark:bg-[#09090B] rounded-none p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 font-display uppercase tracking-tight flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-indigo-500" />
            CALENDAR MERGING & GAP ANALYZER
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 uppercase font-mono font-bold">
            GEMINI SCANS CALENDAR GAPS TO AUTO-BLOCK FOCUS TIME FOR CRITICAL TASKS.
          </p>
        </div>

        {unscheduledCriticalTasks.length > 0 && (
          <button
            id="auto-fill-gaps-btn"
            onClick={handleAutoFillGaps}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black font-mono uppercase tracking-tight rounded-none bg-[#DFE104] hover:bg-black hover:text-[#DFE104] text-black border-2 border-black dark:hover:bg-[#DFE104] dark:hover:text-black transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            AUTO-FILL {unscheduledCriticalTasks.length} CRITICAL GAP{unscheduledCriticalTasks.length > 1 ? 'S' : ''}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Scheduled Timeline */}
        <div className="lg:col-span-8 bg-gray-50 dark:bg-zinc-950 rounded-none border-2 border-black dark:border-[#3F3F46] p-4 max-h-[350px] overflow-y-auto">
          <div className="space-y-2">
            {hours.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 text-xs py-2 border-b-2 border-zinc-200 dark:border-zinc-800 last:border-0"
              >
                <span className="w-20 text-gray-500 dark:text-zinc-400 font-mono font-bold flex-shrink-0">{item.label}</span>
                <div className="flex-grow">
                  {item.block ? (
                    <div className={`p-3 rounded-none border-2 text-[11px] font-bold font-mono uppercase flex items-center justify-between ${
                      item.block === 'Lunch break' 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                        : 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-800 dark:text-indigo-300 border-indigo-500 dark:border-indigo-800'
                    }`}>
                      <span className="truncate">{item.block}</span>
                      {item.block !== 'Lunch break' && (
                        <span className="text-[9px] bg-[#DFE104] text-black px-2 py-0.5 rounded-none border-2 border-black font-mono font-black">
                          FOCUS BLOCK
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 px-4 border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 rounded-none flex items-center justify-between text-[11px] hover:border-black dark:hover:border-zinc-600 hover:bg-[#DFE104]/5 transition-colors">
                      <span>Empty gap available</span>
                      <span className="text-[9px] font-mono font-bold tracking-wider text-gray-400 dark:text-zinc-500">AVAILABLE</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Focus block statistics & integration updates */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-none p-4 border-2 border-black dark:border-zinc-850 flex-grow">
            <h4 className="text-xs font-mono font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
              Focus Schedule Stats
            </h4>
            
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500 dark:text-zinc-400">Scheduled focus hours:</span>
                <span className="font-bold text-gray-900 dark:text-zinc-100">{activeFocusTasks.length * 0.5} hrs</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500 dark:text-zinc-400">Blocked tasks:</span>
                <span className="font-bold text-gray-900 dark:text-zinc-100">{activeFocusTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500 dark:text-zinc-400">Gaps remaining today:</span>
                <span className="font-bold text-gray-700 dark:text-zinc-300">{hours.filter(h => !h.block).length} slots</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 p-4 rounded-none">
            <div className="flex gap-2.5 items-start">
              <CalendarDays className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold font-mono uppercase tracking-tight text-indigo-700 dark:text-indigo-400">Schedule Merging Engine</h5>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 uppercase font-mono leading-normal">
                  All Focus Blocks created inside this dashboard are automatically synced with Google Calendar when enabled in integrations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
