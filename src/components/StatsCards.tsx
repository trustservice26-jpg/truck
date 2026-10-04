import React from 'react';
import { RecordTotals } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { TrendingUp, TrendingDown, Wallet, Fuel, Coins } from 'lucide-react';

interface StatsCardsProps {
  totals: RecordTotals;
  currency?: string;
  subtext?: string;
}

function getCardAmountFontClass(str: string): string {
  const len = str.length;
  if (len > 15) return 'text-xs sm:text-base md:text-lg';
  if (len > 12) return 'text-sm sm:text-lg md:text-xl';
  return 'text-base sm:text-xl md:text-2xl';
}

export const StatsCards: React.FC<StatsCardsProps> = ({ totals, currency = '৳', subtext }) => {
  const { t, isBangla } = useLanguage();
  const isPositive = totals.balance >= 0;

  const incStr = formatCurrency(totals.income, currency);
  const costStr = formatCurrency(totals.cost, currency);
  const otherStr = formatCurrency(totals.other, currency);
  const balStr = formatCurrency(totals.balance, currency);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 my-3 sm:my-6">
      {/* Gross Income Card */}
      <div className="bg-white border border-emerald-200 rounded-xl p-3 sm:p-4 transition-shadow hover:shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-900 leading-tight break-words">
            {t('grossIncome')}
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="my-1.5 sm:my-2">
          <span
            className={`${getCardAmountFontClass(incStr)} font-black tracking-tight text-slate-900 font-mono-tabular block break-all leading-tight`}
          >
            {incStr}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-slate-500 break-words leading-tight">
          <span>
            {totals.entryCount} {t('recordedDays')}
          </span>
        </div>
      </div>

      {/* Running Cost Card (Red Expense Styling) */}
      <div className="bg-red-50/40 border border-red-200 rounded-xl p-3 sm:p-4 transition-shadow hover:shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-red-800 leading-tight break-words">
            {t('fuelCosts')}
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
            <Fuel className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="my-1.5 sm:my-2">
          <span
            className={`${getCardAmountFontClass(costStr)} font-black tracking-tight text-red-600 font-mono-tabular block break-all leading-tight`}
          >
            {costStr}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-red-700/80 break-words leading-tight">
          <span>
            {totals.income > 0
              ? `${((totals.cost / totals.income) * 100).toFixed(1)}% ${t('ofIncome')}`
              : isBangla
              ? 'গাড়ির রানিং খরচ'
              : 'Direct vehicle ops'}
          </span>
        </div>
      </div>

      {/* Other / Maintenance Card (Red Expense Styling) */}
      <div className="bg-red-50/40 border border-red-200 rounded-xl p-3 sm:p-4 transition-shadow hover:shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-red-800 leading-tight break-words">
            {t('incidentals')}
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="my-1.5 sm:my-2">
          <span
            className={`${getCardAmountFontClass(otherStr)} font-black tracking-tight text-red-600 font-mono-tabular block break-all leading-tight`}
          >
            {otherStr}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-red-700/80 break-words leading-tight">
          <span>{isBangla ? 'টোল, মেরামত ও পার্কিং' : 'Tolls, repairs & permits'}</span>
        </div>
      </div>

      {/* Net Balance / Take-Home Card */}
      <div
        className={`border rounded-xl p-3 sm:p-4 transition-shadow hover:shadow-xs min-w-0 overflow-hidden flex flex-col justify-between ${
          isPositive ? 'bg-white border-emerald-300' : 'bg-rose-50/50 border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight break-words">
            {t('netProfit')}
          </span>
          <div
            className={`p-1 sm:p-1.5 rounded-lg shrink-0 ${
              isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isPositive ? (
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>
        <div className="my-1.5 sm:my-2">
          <span
            className={`${getCardAmountFontClass(balStr)} font-black tracking-tight font-mono-tabular block break-all leading-tight ${
              isPositive ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {balStr}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-slate-500 flex items-center justify-between gap-1 flex-wrap leading-tight">
          <span>
            {t('profitMargin')}: <strong className="font-mono-tabular">{totals.marginPercent.toFixed(1)}%</strong>
          </span>
          {subtext && <span className="text-slate-400 hidden xs:inline truncate">· {subtext}</span>}
        </div>
      </div>
    </div>
  );
};
