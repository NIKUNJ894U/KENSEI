import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, Calendar, Sparkles, Activity,
  ArrowUpRight, ArrowDownRight, BarChart2
} from 'lucide-react';
import { Task } from '../types';

interface TaskTrendsChartProps {
  tasks: Task[];
}

export function TaskTrendsChart({ tasks }: TaskTrendsChartProps) {
  const chartData = useMemo(() => {
    // Generate dates for the last 7 days in the user's local timezone
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return dates.map(date => {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Label formatted as "Mon 25" or similar
      const label = startOfDay.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      const fullDateStr = startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Match tasks created on this local day
      const createdCount = tasks.filter(t => {
        if (!t.createdAt) return false;
        const cDate = new Date(t.createdAt);
        return cDate >= startOfDay && cDate <= endOfDay;
      }).length;

      // Match tasks completed on this local day
      const completedCount = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= startOfDay && compDate <= endOfDay;
      }).length;

      // Calculate total steps completed on this day for sub-task analysis
      let completedStepsCount = 0;
      tasks.forEach(t => {
        if (t.steps) {
          t.steps.forEach(s => {
            // If the subtask doesn't have its own timestamp, but the parent is completed on this day, we can check it
            // For fine-grained trends, we count it as completed
            if (s.completed && t.completed && t.completedAt) {
              const compDate = new Date(t.completedAt);
              if (compDate >= startOfDay && compDate <= endOfDay) {
                completedStepsCount++;
              }
            }
          });
        }
      });

      return {
        dayLabel: label,
        fullDate: fullDateStr,
        "Created Tasks": createdCount,
        "Completed Tasks": completedCount,
        "Sub-Steps Cleared": completedStepsCount,
      };
    });
  }, [tasks]);

  // Compute 7-day high-level KPIs
  const kpis = useMemo(() => {
    const totalCompleted = chartData.reduce((sum, d) => sum + d["Completed Tasks"], 0);
    const totalCreated = chartData.reduce((sum, d) => sum + d["Created Tasks"], 0);
    const totalSubSteps = chartData.reduce((sum, d) => sum + d["Sub-Steps Cleared"], 0);
    
    // Average completion velocity
    const averageCompletedPerDay = Math.round(totalCompleted / 7);

    // Find the single highest productivity day
    let highestDay = { label: "N/A", count: 0 };
    chartData.forEach(d => {
      if (d["Completed Tasks"] > highestDay.count) {
        highestDay = { label: d.dayLabel, count: d["Completed Tasks"] };
      }
    });

    // Backlog clearance rate: (Completed / Created) * 100
    const clearanceRate = totalCreated > 0 
      ? Math.round((totalCompleted / totalCreated) * 100) 
      : totalCompleted > 0 ? 100 : 0;

    return {
      totalCompleted,
      totalCreated,
      totalSubSteps,
      averageCompletedPerDay,
      highestDay,
      clearanceRate
    };
  }, [chartData]);

  // Check if we have no active stats in last 7 days to show a neat dynamic preview
  const hasNoData = kpis.totalCompleted === 0 && kpis.totalCreated === 0;

  return (
    <div id="task-trends-chart-card" className="border border-gray-200 bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 font-display flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
            TASK COMPLETION VELOCITY
            <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              REAL-TIME LOCAL
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Compare incoming task demand vs. actual local wall-clock resolutions over the last 7 days.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>7-Day Window</span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 font-sans tracking-wider uppercase">Completed (7d)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-600 font-sans">{kpis.totalCompleted}</span>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-0.5" /> Resolved
            </span>
          </div>
        </div>

        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 font-sans tracking-wider uppercase">Clearance Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-gray-900 font-sans">{kpis.clearanceRate}%</span>
            <span className={`text-[10px] font-semibold flex items-center ${
              kpis.clearanceRate >= 100 ? 'text-emerald-500' : kpis.clearanceRate >= 50 ? 'text-indigo-500' : 'text-amber-500'
            }`}>
              {kpis.clearanceRate >= 100 ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" /> Backlog shrinking
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5" /> Accumulating
                </>
              )}
            </span>
          </div>
        </div>

        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 font-sans tracking-wider uppercase">Velocity Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-indigo-600 font-sans">{kpis.averageCompletedPerDay}</span>
            <span className="text-[10px] text-indigo-500 font-semibold">tasks / day</span>
          </div>
        </div>

        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 font-sans tracking-wider uppercase">Peak Resolution</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-gray-800 font-sans truncate max-w-[80px]">
              {kpis.highestDay.count > 0 ? kpis.highestDay.label : "None Yet"}
            </span>
            {kpis.highestDay.count > 0 && (
              <span className="text-[10px] text-pink-500 font-semibold flex items-center font-mono">
                🔥 {kpis.highestDay.count} resolved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Chart Area */}
      <div 
        className="h-[230px] w-full relative rounded-xl p-2 border border-zinc-200"
        style={{
          backgroundImage: `linear-gradient(to right, #e4e4e7 1px, transparent 1px),
                            linear-gradient(to bottom, #e4e4e7 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          backgroundColor: '#fafafa'
        }}
      >
        {hasNoData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/40 border border-dashed border-gray-200 rounded-2xl p-4 text-center">
            <Sparkles className="w-8 h-8 text-indigo-400 mb-2 animate-bounce" />
            <p className="text-xs font-semibold text-gray-800">No Task Action Logged on This Device Yet</p>
            <p className="text-[10px] text-gray-400 max-w-xs mt-1">
              Once you create new focus items or mark pending critical tasks as completed, your productivity waves and clearance ratios will plot here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis 
                dataKey="dayLabel" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  fontFamily: 'sans-serif',
                  fontSize: '11px'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={32}
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ 
                  fontSize: '10px', 
                  fontFamily: 'sans-serif', 
                  color: '#6b7280',
                  paddingTop: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="Completed Tasks" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCompleted)" 
                activeDot={{ r: 6 }}
              />
              <Area 
                type="monotone" 
                dataKey="Created Tasks" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCreated)" 
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sub-steps details bar */}
      {kpis.totalSubSteps > 0 && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-800">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse flex-shrink-0" />
          <span>
            You resolved <strong className="font-semibold">{kpis.totalSubSteps} incremental sub-steps</strong> of your active focus blocks in the last 7 days! Keep pushing.
          </span>
        </div>
      )}
    </div>
  );
}
