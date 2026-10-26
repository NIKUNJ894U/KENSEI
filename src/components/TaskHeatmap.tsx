import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Calendar, Award, CheckCircle, Info, Sparkles, 
  ChevronRight, ChevronLeft, CalendarDays, Zap, HelpCircle, Star
} from 'lucide-react';
import { Task } from '../types';

interface TaskHeatmapProps {
  tasks: Task[];
}

interface HeatmapDay {
  date: Date;
  isPadding: boolean;
  isToday: boolean;
  completedTasks: Task[];
}

export function TaskHeatmap({ tasks }: TaskHeatmapProps) {
  // Local state for inspecting a specific day's completed tasks
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Generate the list of days for the heatmap (covering the current month)
  const heatmapData = useMemo(() => {
    const today = new Date();
    
    // Start date is the first of the current month
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // End date is the last day of the current month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Align the grid to Sunday
    const gridStartDate = new Date(startDate);
    gridStartDate.setDate(startDate.getDate() - startDate.getDay());

    // Align the end of the grid to Saturday
    const gridEndDate = new Date(endDate);
    gridEndDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: HeatmapDay[] = [];
    const current = new Date(gridStartDate);

    while (current <= gridEndDate) {
      const dayDate = new Date(current);
      
      const isPadding = dayDate < startDate || dayDate > endDate;
      
      const isToday = 
        dayDate.getDate() === today.getDate() &&
        dayDate.getMonth() === today.getMonth() &&
        dayDate.getFullYear() === today.getFullYear();

      const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);

      const completedOnDay = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= startOfDay && compDate <= endOfDay;
      });

      days.push({
        date: dayDate,
        isPadding,
        isToday,
        completedTasks: completedOnDay
      });

      current.setDate(current.getDate() + 1);
    }

    const weeks: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return {
      weeks,
      startDate,
      endDate
    };
  }, [tasks]);

  // Compute Streak and Consistency Stats based on the current month
  const stats = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const daysInMonth = endDate.getDate();
    const completionMap: Record<string, number> = {};
    const monthDaysList: Date[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), i);
      monthDaysList.push(d);

      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      
      const start = new Date(d.getFullYear(), d.getMonth(), i, 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), i, 23, 59, 59, 999);
      
      const completedCount = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= start && compDate <= end;
      }).length;

      completionMap[key] = completedCount;
    }

    // 1. Calculate streaks (scanning chronological order)
    let maxStreak = 0;
    let tempStreak = 0;

    monthDaysList.forEach((day) => {
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      const completedCount = completionMap[key] || 0;

      if (completedCount > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    // 2. Consistency
    const completedDaysCount = Object.values(completionMap).filter(count => count > 0).length;
    const consistencyPercentage = Math.round((completedDaysCount / daysInMonth) * 100);

    // 3. Total tasks completed
    const totalCompletedInMonth = Object.values(completionMap).reduce((sum, count) => sum + count, 0);

    // 4. Badge and Title levels
    let title = "Focus Apprentice 🎯";
    let badgeBg = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    let badgeDesc = "Complete a task to kickstart your focus habit!";
    let levelProgress = consistencyPercentage;
    let nextTitle = "Habit Builder 🌱";

    if (consistencyPercentage >= 80) {
      title = "Elite Achiever 🏆";
      badgeBg = "bg-[#DFE104] text-black border-2 border-black rounded-none shadow-none uppercase font-mono font-black";
      badgeDesc = "A stellar, world-class routine. Your dedication is unbreakable!";
      levelProgress = 100;
      nextTitle = "Maximum Mastery 🌌";
    } else if (consistencyPercentage >= 50) {
      title = "Consistency Champ ⚡";
      badgeBg = "bg-indigo-100 text-indigo-900 border-2 border-black rounded-none uppercase font-mono font-black";
      badgeDesc = "Strong work ethic! You resolve tasks on more than half your days.";
      nextTitle = "Elite Achiever 🏆";
      levelProgress = Math.round(((consistencyPercentage - 50) / 30) * 100);
    } else if (consistencyPercentage >= 25) {
      title = "Habit Builder 🌱";
      badgeBg = "bg-emerald-100 text-emerald-900 border-2 border-black rounded-none uppercase font-mono font-black";
      badgeDesc = "Great progress! Your daily momentum is beginning to build.";
      nextTitle = "Consistency Champ ⚡";
      levelProgress = Math.round(((consistencyPercentage - 25) / 25) * 100);
    } else {
      title = "Focus Apprentice 🎯";
      badgeBg = "bg-zinc-100 text-zinc-900 border-2 border-black rounded-none uppercase font-mono font-black";
      badgeDesc = "Complete a task to kickstart your focus habit!";
      levelProgress = Math.round((consistencyPercentage / 25) * 100);
    }

    return {
      currentStreak: tempStreak, // Simplified for now
      maxStreak,
      completedDaysCount,
      consistencyPercentage,
      totalCompletedInMonth,
      title,
      badgeBg,
      badgeDesc,
      nextTitle,
      levelProgress
    };
  }, [tasks]);

  // Color selection helper based on number of tasks completed
  const getCellStyles = (day: HeatmapDay) => {
    if (day.isPadding) {
      return 'bg-transparent border border-dashed border-zinc-200 dark:border-zinc-800/25 pointer-events-none opacity-20';
    }

    const count = day.completedTasks.length;

    // Check if selected
    const isSelected = selectedDay && 
      selectedDay.date.toDateString() === day.date.toDateString();

    const baseStyle = "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-none border-2 border-black/80 dark:border-zinc-800 transition-all duration-150 relative cursor-pointer hover:scale-105 flex items-center justify-center text-[10px] font-bold font-mono";
    const selectedRing = isSelected 
      ? "ring-4 ring-[#DFE104] scale-105 z-10" 
      : "hover:border-black dark:hover:border-[#DFE104]";

    const todayBorder = day.isToday
      ? "border-2 border-red-500 animate-pulse"
      : "border-2 border-black dark:border-zinc-800";

    let colorStyle = "";
    if (count === 0) {
      colorStyle = "bg-white dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700";
    } else if (count === 1) {
      colorStyle = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-[#DFE104]/30";
    } else if (count === 2) {
      colorStyle = "bg-emerald-300 dark:bg-emerald-800/70 text-emerald-950 dark:text-emerald-200 hover:bg-[#DFE104]/40";
    } else if (count === 3) {
      colorStyle = "bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600";
    } else {
      colorStyle = "bg-[#DFE104] text-black font-black hover:bg-black hover:text-[#DFE104]";
    }

    return `${baseStyle} ${selectedRing} ${todayBorder} ${colorStyle}`;
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div id="30-day-task-heatmap-card" className="border-2 border-black dark:border-[#3F3F46] bg-white dark:bg-[#09090B] rounded-none p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black dark:border-[#3F3F46] pb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 font-display uppercase tracking-tight flex items-center gap-2">
            <Flame className={`w-4.5 h-4.5 text-orange-500 ${stats.currentStreak > 0 ? 'animate-bounce' : ''}`} />
            MONTHLY CONSISTENCY HEATMAP
            {stats.currentStreak > 0 && (
              <span className="text-[10px] font-mono bg-[#DFE104] border-2 border-black text-black px-2 py-0.5 rounded-none font-bold">
                🔥 {stats.currentStreak} DAY STREAK
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 uppercase font-mono font-bold">
            BUILD DAILY MOMENTUM BY COMPLETING ACTIVE TASKS. CLICK A SQUARE TO INSPECT.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase">
          <Calendar className="w-3.5 h-3.5" />
          <span>Current Month</span>
        </div>
      </div>

      {/* Grid Overview & Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Stats and Badges */}
        <div className="lg:col-span-4 flex flex-col gap-4 justify-between bg-zinc-50 dark:bg-zinc-950 border-2 border-black dark:border-[#3F3F46] rounded-none p-4">
          <div className="space-y-3.5">
            {/* Level Badge */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-none flex items-center justify-center ${stats.badgeBg}`}>
                <Award className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-bold block">CURRENT LEVEL</span>
                <span className="text-xs font-black text-gray-800 dark:text-zinc-100 font-sans uppercase">{stats.title}</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 leading-relaxed uppercase font-bold">
              "{stats.badgeDesc}"
            </p>

            {/* Level Progress */}
            {stats.consistencyPercentage < 80 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-gray-500 dark:text-zinc-400 uppercase font-bold">
                  <span>PROGRESS TO {stats.nextTitle.toUpperCase()}</span>
                  <span>{stats.consistencyPercentage}% / 30d</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 rounded-none overflow-hidden border-2 border-black">
                  <div 
                    className="bg-emerald-500 h-full rounded-none transition-all duration-500"
                    style={{ width: `${stats.consistencyPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats list */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-black dark:border-zinc-800/50">
            <div className="text-center p-2.5 bg-white dark:bg-zinc-900 rounded-none border-2 border-black">
              <span className="text-[9px] font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase block">MAX STREAK</span>
              <span className="text-xs font-black font-mono text-gray-800 dark:text-zinc-100 flex items-center justify-center gap-1 mt-1 uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {stats.maxStreak} {stats.maxStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-center p-2.5 bg-white dark:bg-zinc-900 rounded-none border-2 border-black">
              <span className="text-[9px] font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase block">TOTAL CLEARED</span>
              <span className="text-xs font-black font-mono text-gray-800 dark:text-zinc-100 flex items-center justify-center gap-1 mt-1 uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {stats.totalCompletedInMonth} tasks
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: The Heatmap Matrix */}
        <div className="lg:col-span-8 flex flex-col justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 border-2 border-black dark:border-[#3F3F46] rounded-none p-4 overflow-x-auto">
          <div className="flex gap-2.5 min-w-[340px] items-start select-none">
            
            {/* Weekday Labels Column */}
            <div className="grid grid-rows-7 gap-1.5 pt-6 text-[10px] font-mono text-gray-400 dark:text-zinc-500 text-right pr-1 flex-shrink-0">
              {weekdays.map((day, idx) => (
                <span 
                  key={day} 
                  className={`h-6.5 sm:h-7 flex items-center justify-end pr-1.5 ${
                    idx % 2 === 1 ? 'opacity-100 font-bold' : 'opacity-40 text-[9px]'
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-1.5 flex-grow">
              {heatmapData.weeks.map((week, weekIdx) => {
                // Find month label for this column if it's the start of a month or first column
                const firstDayOfCol = week.find(d => !d.isPadding);
                const showMonthLabel = firstDayOfCol && (
                  weekIdx === 0 || 
                  firstDayOfCol.date.getDate() <= 7
                );

                const monthLabel = firstDayOfCol 
                  ? firstDayOfCol.date.toLocaleDateString('en-US', { month: 'short' }) 
                  : '';

                return (
                  <div key={weekIdx} className="flex flex-col gap-1.5 flex-grow items-center">
                    {/* Month header column slot */}
                    <div className="h-4.5 text-[10px] font-black font-mono text-gray-500 dark:text-zinc-400 text-center uppercase truncate max-w-[40px]">
                      {showMonthLabel ? monthLabel : ''}
                    </div>

                    {/* 7 Days Grid Cells */}
                    {week.map((day, dayIdx) => {
                      const count = day.completedTasks.length;
                      return (
                        <div
                          key={dayIdx}
                          onClick={() => !day.isPadding && setSelectedDay(day)}
                          className={getCellStyles(day)}
                          title={`${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}: ${count} completed ${count === 1 ? 'task' : 'tasks'}`}
                        >
                          {/* Inner dot or count representation if needed */}
                          {count > 0 && <span className="opacity-0 hover:opacity-100 absolute inset-0 flex items-center justify-center pointer-events-none scale-75 font-bold">{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 dark:text-zinc-400 border-t-2 border-zinc-200 dark:border-zinc-800/60 pt-3 select-none">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <span className="w-3 h-3 border-2 border-red-500 bg-white dark:bg-zinc-800" />
              CURRENT DAY
            </span>
            <div className="flex items-center gap-1 font-bold uppercase">
              <span>Less</span>
              <span className="w-3.5 h-3.5 border-2 border-black bg-white dark:bg-zinc-900" />
              <span className="w-3.5 h-3.5 border-2 border-black bg-emerald-100" />
              <span className="w-3.5 h-3.5 border-2 border-black bg-emerald-300" />
              <span className="w-3.5 h-3.5 border-2 border-black bg-emerald-500" />
              <span className="w-3.5 h-3.5 border-2 border-black bg-[#DFE104]" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Daily Inspector Panel */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay.date.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-black dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 flex flex-col gap-3 rounded-none"
          >
            <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-850 pb-2.5">
              <span className="text-xs font-black font-mono uppercase text-gray-800 dark:text-zinc-200 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-[10px] font-black font-mono uppercase tracking-tight text-red-600 hover:text-black dark:hover:text-white cursor-pointer border-2 border-transparent hover:border-black px-1.5"
              >
                Clear Inspect
              </button>
            </div>

            {selectedDay.completedTasks.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-black uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 fill-emerald-500" />
                  {selectedDay.completedTasks.length} {selectedDay.completedTasks.length === 1 ? 'TASK' : 'TASKS'} RESOLVED:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {selectedDay.completedTasks.map((task) => {
                    const timeCompletedStr = task.completedAt 
                      ? new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : '';
                    
                    return (
                      <div 
                        key={task.id}
                        className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 p-3 rounded-none flex items-start gap-2 shadow-none"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold font-mono uppercase text-gray-800 dark:text-zinc-100 truncate">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-gray-500 dark:text-zinc-400 uppercase font-bold">
                            <span className="px-1.5 py-0.5 rounded-none border border-black bg-zinc-50 dark:bg-zinc-800">
                              {task.category || "General"}
                            </span>
                            {timeCompletedStr && (
                              <span>at {timeCompletedStr}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-1 text-xs text-gray-500 dark:text-zinc-400 font-mono uppercase font-bold">
                <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>
                  No tasks were completed on this day. Capture chaos and build your streak!
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
