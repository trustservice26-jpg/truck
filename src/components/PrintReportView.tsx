import React from 'react';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { Truck, FileText } from 'lucide-react';

interface PrintReportViewProps {
  profile: Profile;
  records: DailyRecord[];
  totals: RecordTotals;
  from: string;
  to: string;
  screenPreview?: boolean;
}

function getBoxAmountSizeClass(formatted: string): string {
  const len = formatted.length;
  if (len > 15) return 'text-xs sm:text-xs md:text-sm';
  if (len > 12) return 'text-xs sm:text-sm md:text-base';
  return 'text-sm sm:text-base md:text-lg';
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  profile,
  records,
  totals,
  from,
  to,
  screenPreview = false,
}) => {
  const { isBangla } = useLanguage();

  const currentDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statementDocId = `FL-${profile.vehicle_number || 'VEH'}-${from.replace(/-/g, '')}-${to.replace(/-/g, '')}`;

  const incStr = formatCurrency(totals.income, '৳');
  const costStr = formatCurrency(totals.cost, '৳');
  const otherStr = formatCurrency(totals.other, '৳');
  const balStr = formatCurrency(totals.balance, '৳');

  return (
    <div
      className={
        screenPreview
          ? 'bg-white border border-slate-300 rounded-xl sm:rounded-sm p-3.5 sm:p-8 md:p-10 shadow-xl sm:shadow-2xl text-slate-900 font-sans max-w-[210mm] mx-auto transition-all'
          : 'print-only print-container p-4 sm:p-6 bg-white text-black font-sans w-full max-w-[210mm] mx-auto'
      }
      style={{
        minHeight: screenPreview ? '270mm' : 'auto',
      }}
    >
      {/* Top Document Header Bar / Dialogue Box */}
      <div className="border-b-2 border-slate-900 pb-2.5 sm:pb-4 mb-3 sm:mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
          {/* Brand & Main Title */}
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs print:bg-black">
              <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-slate-800">
                  FLEET-LEDGER
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded border border-blue-300 tracking-wide uppercase inline-flex items-center gap-1 shadow-2xs">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-600"></span>
                  {isBangla ? 'অডিট বিবরণী' : 'AUDIT STATEMENT'}
                </span>
              </div>
              <h1 className="text-xs sm:text-base md:text-xl font-black tracking-tight text-slate-950 uppercase mt-0.5 leading-snug break-words">
                {isBangla
                  ? 'গাড়ির আয় ও পরিচালন ব্যয়ের খতিয়ান (টাকা ৳)'
                  : 'Vehicle Income & Operating Cost Ledger (৳)'}
              </h1>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                {isBangla
                  ? 'অফিসিয়াল ফ্লিট অডিট ও চালকের হিসাব নিষ্পত্তি বিবরণী'
                  : 'Official Fleet Audit & Driver Settlement Statement (Currency: Taka ৳)'}
              </p>
            </div>
          </div>

          {/* Right/Bottom Metadata Dialogue Box for Mobile & Desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col sm:text-right gap-1 p-1.5 sm:p-0 bg-slate-50 sm:bg-transparent rounded-md border border-slate-200 sm:border-0 text-[10px] sm:text-xs shrink-0">
            <div>
              <span className="text-slate-500 font-medium">{isBangla ? 'ডক রেফারেন্স:' : 'Doc Ref:'}</span>{' '}
              <span className="font-mono-tabular font-bold text-slate-900">{statementDocId}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">{isBangla ? 'তৈরির সময়:' : 'Generated:'}</span>{' '}
              <span className="font-bold text-slate-900 whitespace-nowrap">{currentDate}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 pt-0.5 sm:pt-0 border-t border-slate-200 sm:border-0">
              <span className="text-slate-500 font-medium">{isBangla ? 'সময়কাল:' : 'Period:'}</span>{' '}
              <span className="font-bold text-slate-950 font-mono-tabular whitespace-nowrap">
                {formatDisplayDate(from)} {isBangla ? 'থেকে' : 'to'} {formatDisplayDate(to)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle and Driver Credentials Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-3.5 border border-slate-300 bg-slate-50/80 mb-4 sm:mb-5 text-xs rounded-lg">
        <div className="sm:border-r border-slate-200 sm:pr-2 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold block tracking-wider">
            {isBangla ? 'লগইন নম্বর (Log in Number):' : 'Log in Number:'}
          </span>
          <span className="font-black text-xs sm:text-sm text-slate-950 font-mono-tabular mt-0.5 block break-all">
            {profile.vehicle_number || 'N/A'}
          </span>
          {profile.vehicle_register_number && (
            <span className="text-[10px] text-slate-600 block mt-0.5 break-all font-mono">
              {isBangla ? 'রেজিঃ' : 'Reg:'} {profile.vehicle_register_number}
            </span>
          )}
        </div>
        <div className="sm:border-r border-slate-200 sm:pr-2 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold block tracking-wider">
            {isBangla ? 'চালকের নাম (Driver Name):' : 'Driver Name:'}
          </span>
          <span className="font-bold text-xs sm:text-sm text-slate-950 mt-0.5 block break-words">
            {profile.name || 'N/A'}
          </span>
        </div>
        <div className="sm:border-r border-slate-200 sm:pr-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold block tracking-wider">
            {isBangla ? 'ফোন নম্বর (Phone):' : 'Contact Phone:'}
          </span>
          <span className="font-medium text-xs text-slate-900 font-mono-tabular mt-0.5 block break-all">
            {profile.phone || 'N/A'}
          </span>
        </div>
        <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold block tracking-wider">
            {isBangla ? 'অ্যাকাউন্ট রোল / মুদ্রা:' : 'Account Role & Currency:'}
          </span>
          <span className="inline-block mt-0.5 font-bold text-[10px] sm:text-xs uppercase px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
            {(profile.role || 'USER').toUpperCase()} · ৳ TAKA
          </span>
        </div>
      </div>

      {/* Financial Executive Summary Calculation Boxes (4 Cards Adjusted to Fit All Calculations in Bangla & English) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4 sm:mb-5 text-center">
        {/* Box 1: Gross Income */}
        <div className="border border-emerald-300 p-2 sm:p-2.5 bg-emerald-50/60 rounded-lg flex flex-col justify-between min-w-0 overflow-hidden">
          <span className="text-[9px] sm:text-[10px] text-emerald-900 uppercase font-extrabold tracking-tight block leading-tight break-words">
            {isBangla ? 'মোট আয় (Gross Income)' : 'Gross Income (৳)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(incStr)} font-black font-mono-tabular text-emerald-950 my-1 block break-all leading-tight`}
          >
            {incStr}
          </span>
          <span className="text-[9px] sm:text-[10px] text-emerald-700 font-medium block leading-tight break-words">
            {isBangla ? `${totals.entryCount} দিনের মোট জমা` : `${totals.entryCount} Days Revenue Logged`}
          </span>
        </div>

        {/* Box 2: Fuel & Direct Costs (Red Color for Expense) */}
        <div className="border border-red-300 p-2 sm:p-2.5 bg-red-50/70 rounded-lg flex flex-col justify-between min-w-0 overflow-hidden">
          <span className="text-[9px] sm:text-[10px] text-red-800 uppercase font-extrabold tracking-tight block leading-tight break-words">
            {isBangla ? 'জ্বালানি ও খরচ (Expense)' : 'Fuel & Costs (Expense)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(costStr)} font-black font-mono-tabular text-red-600 my-1 block break-all leading-tight`}
          >
            {costStr}
          </span>
          <span className="text-[9px] sm:text-[10px] text-red-700 font-medium block leading-tight break-words">
            {isBangla ? 'জ্বালানি ও ইঞ্জিন ব্যয়' : 'Fuel & Engine Ops Cost'}
          </span>
        </div>

        {/* Box 3: Other Expenses (Red Color for Expense) */}
        <div className="border border-red-300 p-2 sm:p-2.5 bg-red-50/70 rounded-lg flex flex-col justify-between min-w-0 overflow-hidden">
          <span className="text-[9px] sm:text-[10px] text-red-800 uppercase font-extrabold tracking-tight block leading-tight break-words">
            {isBangla ? 'অন্যান্য খরচ (Expense)' : 'Other Costs (Expense)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(otherStr)} font-black font-mono-tabular text-red-600 my-1 block break-all leading-tight`}
          >
            {otherStr}
          </span>
          <span className="text-[9px] sm:text-[10px] text-red-700 font-medium block leading-tight break-words">
            {isBangla ? 'টোল ও আনুষঙ্গিক ব্যয়' : 'Tolls & Incidentals'}
          </span>
        </div>

        {/* Box 4: Net Settlement Balance */}
        <div className="border-2 border-slate-900 p-2 sm:p-2.5 bg-slate-100 rounded-lg flex flex-col justify-between min-w-0 overflow-hidden">
          <span className="text-[9px] sm:text-[10px] text-slate-900 uppercase font-black tracking-tight block leading-tight break-words">
            {isBangla ? 'নিট ব্যালেন্স (Net Balance)' : 'Net Settlement (৳)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(balStr)} font-black font-mono-tabular my-1 block break-all leading-tight ${
              totals.balance >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {balStr}
          </span>
          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 block leading-tight break-words">
            {totals.balance >= 0
              ? isBangla
                ? `নিট লাভ (${totals.marginPercent.toFixed(1)}%)`
                : `Net Surplus (${totals.marginPercent.toFixed(1)}%)`
              : isBangla
              ? 'পরিচালন ঘাটতি (Deficit)'
              : 'Operating Deficit'}
          </span>
        </div>
      </div>

      {/* Itemized Ledger Table with Horizontal Scroll Support on Mobile */}
      <div className="border border-slate-300 rounded-lg overflow-x-auto mb-5 sm:mb-6 shadow-2xs">
        <table className="w-full min-w-[540px] sm:min-w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900 uppercase tracking-wider text-[10px] sm:text-[11px]">
              <th className="py-2.5 px-2.5 border-r border-slate-300 w-24 text-center">
                {isBangla ? 'তারিখ (Date)' : 'Date'}
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-28 text-emerald-900">
                {isBangla ? 'আয় (Income ৳)' : 'Income (৳)'}
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-28 text-red-700 bg-red-50/60">
                {isBangla ? 'খরচ (Cost ৳)' : 'Cost (Expense ৳)'}
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300">
                {isBangla ? 'খরচের বিবরণ (Details)' : 'Cost Details'}
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-26 text-red-700 bg-red-50/60">
                {isBangla ? 'অন্যান্য (Other ৳)' : 'Other (Expense ৳)'}
              </th>
              <th className="py-2.5 px-2.5 text-right w-28">
                {isBangla ? 'নিট ব্যালেন্স (৳)' : 'Net Balance (৳)'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.length > 0 ? (
              records.map((r, idx) => {
                const bal =
                  (Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0);
                const detailStr = [r.cost_location, r.cost_details, r.other_details]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <tr
                    key={r.id || idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="py-2 px-2.5 border-r border-slate-200 font-mono-tabular font-bold text-slate-950 text-center whitespace-nowrap">
                      {formatDisplayDate(r.record_date)}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono-tabular font-semibold text-emerald-900 whitespace-nowrap">
                      {formatCurrency(r.income, '৳')}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono-tabular font-bold text-red-600 whitespace-nowrap">
                      {formatCurrency(r.cost, '৳')}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-slate-700 text-xs break-words">
                      {detailStr ? (
                        <span>{detailStr}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono-tabular font-bold text-red-600 whitespace-nowrap">
                      {formatCurrency(r.other, '৳')}
                    </td>
                    <td
                      className={`py-2 px-2.5 text-right font-mono-tabular font-bold whitespace-nowrap ${
                        bal >= 0 ? 'text-slate-900' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(bal, '৳')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 bg-white">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <FileText className="w-6 h-6 text-slate-400" />
                    <span className="font-semibold text-xs text-slate-700">
                      {isBangla
                        ? 'এই সময়ের জন্য কোনো লেনদেন রেকর্ড পাওয়া যায়নি'
                        : 'No transactions recorded for this period'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDisplayDate(from)} {isBangla ? 'থেকে' : 'to'} {formatDisplayDate(to)}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-950">
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-black">
                {isBangla ? 'সর্বমোট (TOTALS)' : 'TOTALS'}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono-tabular font-black text-emerald-950 whitespace-nowrap">
                {formatCurrency(totals.income, '৳')}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono-tabular font-black text-red-600 bg-red-50/60 whitespace-nowrap">
                {formatCurrency(totals.cost, '৳')}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-center text-red-600 font-bold text-[11px]">
                {isBangla
                  ? `মোট খরচ: ${formatCurrency(totals.cost + totals.other, '৳')}`
                  : `Total Cost: ${formatCurrency(totals.cost + totals.other, '৳')}`}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono-tabular font-black text-red-600 bg-red-50/60 whitespace-nowrap">
                {formatCurrency(totals.other, '৳')}
              </td>
              <td
                className={`py-2.5 px-2.5 text-right font-mono-tabular font-black border-b-2 border-slate-900 whitespace-nowrap ${
                  totals.balance >= 0 ? 'text-emerald-800' : 'text-red-600'
                }`}
              >
                {formatCurrency(totals.balance, '৳')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Official Footnote & Archival Watermark */}
      <div className="mt-6 sm:mt-8 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-1 text-center sm:text-left">
        <span>
          FLEET-LEDGER Enterprise ·{' '}
          {isBangla ? 'অফিসিয়াল হিসাব নিষ্পত্তি বিবরণী' : 'Official Settlement Document'}
        </span>
        <span>
          Log in Number: {profile.vehicle_number}
          {profile.vehicle_register_number ? ` (Reg: ${profile.vehicle_register_number})` : ''} ·{' '}
          {isBangla ? 'পৃষ্ঠা ১' : 'Page 1 of 1'}
        </span>
      </div>
    </div>
  );
};
