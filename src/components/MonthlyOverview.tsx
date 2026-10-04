import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { DailyRecord } from '../types';
import { supabase } from '../supabase';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { TrendingUp, TrendingDown, DollarSign, Fuel, Calendar, BarChart3, Layers } from 'lucide-react';

interface MonthlyOverviewProps {
  userId: string;
  vehicleNumber?: string;
  currentRecords?: DailyRecord[];
}

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({
  userId,
  vehicleNumber,
  currentRecords,
}) => {
  const [allUserRecords, setAllUserRecords] = useState<DailyRecord[]>(currentRecords || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'comparison' | 'timeline'>('comparison');

  // Month selection: default to current month YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Fetch full user records if not provided or to ensure complete month data
  useEffect(() => {
    let isMounted = true;
    const loadRecords = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_records')
          .select('*')
          .eq('user_id', userId)
          .order('record_date', { ascending: true });
        if (isMounted && data) {
          setAllUserRecords(data);
        }
      } catch (err) {
        console.error('Failed to load monthly overview records:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRecords();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Determine available months from records + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthStr);
    allUserRecords.forEach(r => {
      if (r.record_date && r.record_date.length >= 7) {
        monthsSet.add(r.record_date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allUserRecords, currentMonthStr]);

  // Filter records for the selected month
  const monthRecords = useMemo(() => {
    return allUserRecords.filter(r => r.record_date && r.record_date.startsWith(selectedMonth));
  }, [allUserRecords, selectedMonth]);

  // Compute aggregate totals for the month
  const monthTotals = useMemo(() => {
    const inc = monthRecords.reduce((acc, r) => acc + (Number(r.income) || 0), 0);
    const fuelCost = monthRecords.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const otherCost = monthRecords.reduce((acc, r) => acc + (Number(r.other) || 0), 0);
    const totalExpenses = fuelCost + otherCost;
    const balance = inc - totalExpenses;
    const expenseRatio = inc > 0 ? (totalExpenses / inc) * 100 : 0;
    const profitMargin = inc > 0 ? (balance / inc) * 100 : 0;

    return {
      income: inc,
      fuelCost,
      otherCost,
      expenses: totalExpenses,
      balance,
      expenseRatio,
      profitMargin,
      count: monthRecords.length,
    };
  }, [monthRecords]);

  // Format month name label (e.g. "October 2026")
  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const idx = parseInt(m, 10) - 1;
    return `${monthNames[idx] || m} ${y}`;
  }, [selectedMonth]);

  const isCurrentMonth = selectedMonth === currentMonthStr;

  // Data for "Total Comparison" Bar Chart
  const comparisonData = useMemo(() => {
    return [
      {
        category: 'Total Income',
        amount: monthTotals.income,
        fill: '#10B981', // Emerald
      },
      {
        category: 'Total Expenses',
        amount: monthTotals.expenses,
        fill: '#EF4444', // Rose/Red
        fuel: monthTotals.fuelCost,
        other: monthTotals.otherCost,
      },
    ];
  }, [monthTotals]);

  // Data for "Daily Breakdown" Timeline Bar Chart
  const timelineData = useMemo(() => {
    const dayMap = new Map<string, { date: string; income: number; expenses: number; cost: number; other: number }>();
    monthRecords.forEach(r => {
      const day = r.record_date;
      const inc = Number(r.income) || 0;
      const cost = Number(r.cost) || 0;
      const other = Number(r.other) || 0;
      const exp = cost + other;

      if (!dayMap.has(day)) {
        dayMap.set(day, { date: day, income: inc, expenses: exp, cost, other });
      } else {
        const existing = dayMap.get(day)!;
        existing.income += inc;
        existing.expenses += exp;
        existing.cost += cost;
        existing.other += other;
      }
    });

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      displayDate: d.date.slice(8), // day of month "01", "15"
      fullDate: formatDisplayDate(d.date),
    }));
  }, [monthRecords]);

  // Custom Recharts Tooltip for Comparison Chart
  const renderComparisonTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[160px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{item.category}</span>
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: item.fill }}
            />
          </div>
          <div className="text-base font-extrabold font-mono-tabular">
            {formatCurrency(item.amount)}
          </div>
          {item.category === 'Total Expenses' && (
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 space-y-0.5">
              <div className="flex justify-between">
                <span>Fuel / Direct:</span>
                <span className="font-mono-tabular text-slate-200">{formatCurrency(item.fuel)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Costs:</span>
                <span className="font-mono-tabular text-slate-200">{formatCurrency(item.other)}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Daily Breakdown Chart
  const renderTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[180px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">
            {item.fullDate}
          </div>
          <div className="flex items-center justify-between text-emerald-400 font-semibold">
            <span>Income:</span>
            <span className="font-mono-tabular">{formatCurrency(item.income)}</span>
          </div>
          <div className="flex items-center justify-between text-rose-400 font-semibold">
            <span>Expenses:</span>
            <span className="font-mono-tabular">{formatCurrency(item.expenses)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800 font-bold">
            <span>Net:</span>
            <span
              className={`font-mono-tabular ${
                item.income - item.expenses >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(item.income - item.expenses)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Monthly Overview</h3>
                {isCurrentMonth ? (
                  <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">
                    Current Month
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
                    Archived Month
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Total revenue earnings vs running expenses for {monthLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Month Selector & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              {availableMonths.map(m => {
                const [y, mon] = m.split('-');
                const names = [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];
                const label = `${names[parseInt(mon, 10) - 1] || mon} ${y}`;
                return (
                  <option key={m} value={m}>
                    {label} {m === currentMonthStr ? '(Current)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Toggle View: Total Comparison vs Daily Timeline */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-medium shrink-0">
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-xs ${
                viewMode === 'comparison'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-xs ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Trend
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Income Card */}
        <div className="p-3 sm:p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] sm:text-xs font-semibold mb-1">
            <span>Total Income</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black font-mono-tabular text-emerald-950 truncate">
            {formatCurrency(monthTotals.income)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 truncate">
            {monthTotals.count} recorded trip entries
          </div>
        </div>

        {/* Expenses Card */}
        <div className="p-3 sm:p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl">
          <div className="flex items-center justify-between text-rose-800 text-[11px] sm:text-xs font-semibold mb-1">
            <span>Total Expenses</span>
            <Fuel className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black font-mono-tabular text-rose-950 truncate">
            {formatCurrency(monthTotals.expenses)}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5 truncate">
            Fuel: {formatCurrency(monthTotals.fuelCost)} · Oth: {formatCurrency(monthTotals.otherCost)}
          </div>
        </div>

        {/* Net Operating Balance */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-slate-700 text-[11px] sm:text-xs font-semibold mb-1">
            <span className="truncate">Net Balance</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>
          <div
            className={`text-base sm:text-xl font-black font-mono-tabular truncate ${
              monthTotals.balance >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCurrency(monthTotals.balance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {monthTotals.balance >= 0 ? 'Net Surplus' : 'Operating Deficit'}
          </div>
        </div>

        {/* Expense Ratio / Margin */}
        <div className="p-3 sm:p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
          <div className="flex items-center justify-between text-blue-800 text-[11px] sm:text-xs font-semibold mb-1">
            <span className="truncate">Expense Ratio</span>
            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="text-base sm:text-xl font-black font-mono-tabular text-blue-950 truncate">
            {monthTotals.expenseRatio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5 truncate">
            Margin: {monthTotals.profitMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="pt-1 sm:pt-2">
        {monthRecords.length === 0 ? (
          <div className="py-10 sm:py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-700">No transactions recorded for {monthLabel}</h4>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Select another month from the dropdown above or log daily trips in the Ledger tab.
            </p>
          </div>
        ) : viewMode === 'comparison' ? (
          /* Total Income vs Expenses Side-by-Side Comparison */
          <div>
            <div className="mb-2.5 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">
                {monthLabel} (Income vs Expenses)
              </span>
              <span className="font-mono-tabular text-[10px] sm:text-[11px]">
                Net: {formatCurrency(monthTotals.balance)}
              </span>
            </div>
            <div className="h-[240px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 15 }}
                  barSize={48}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={val => `$${val}`}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderComparisonTooltip} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Daily Breakdown of Income vs Expenses */
          <div>
            <div className="mb-2.5 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">
                Daily Trend in {monthLabel}
              </span>
              <div className="flex items-center gap-3 text-[10px] sm:text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
                  <span>Income</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
                  <span>Expenses</span>
                </span>
              </div>
            </div>
            <div className="h-[240px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timelineData}
                  margin={{ top: 15, right: 10, left: -10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={val => `$${val}`}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTimelineTooltip} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                  <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="income"
                    name="Daily Income"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Daily Expenses"
                    fill="#EF4444"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
