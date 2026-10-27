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
  if (len > 15) return 'text-xs sm:text-sm md:text-base';
  if (len > 12) return 'text-sm sm:text-base md:text-lg';
  return 'text-base sm:text-lg md:text-xl';
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
          ? 'bg-white border border-slate-300 rounded-xl sm:rounded-2xl p-4 sm:p-8 md:p-10 shadow-lg text-slate-900 font-sans max-w-[210mm] mx-auto transition-all print:p-0 print:border-none print:shadow-none print:max-w-full'
          : 'print-only print-container p-0 bg-white text-black font-sans w-full max-w-[190mm] mx-auto'
      }
      style={{
        minHeight: screenPreview ? '270mm' : 'auto',
      }}
    >
      {/* Top Document Header Bar */}
      <div className="border-b-2 border-slate-900 pb-3 sm:pb-4 mb-4 sm:mb-5 print:pb-2.5 print:mb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
          {/* Brand & Main Title */}
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs print:bg-black">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-900">
                  FLEET-LEDGER
                </span>
                <span className="text-[10px] sm:text-xs font-extrabold px-2 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-300 tracking-wide uppercase inline-flex items-center gap-1 print:border-slate-400 print:bg-slate-100 print:text-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 print:bg-black"></span>
                  {isBangla ? 'অডিট বিবরণী' : 'AUDIT STATEMENT'}
                </span>
              </div>
              <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-slate-950 uppercase mt-1 leading-snug break-words">
                {isBangla
                  ? 'গাড়ির আয় ও পরিচালন ব্যয়ের খতিয়ান (টাকা ৳)'
                  : 'Vehicle Income & Operating Cost Ledger (৳)'}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 print:text-slate-700">
                {isBangla
                  ? 'অফিসিয়াল ফ্লিট অডিট ও চালকের হিসাব নিষ্পত্তি বিবরণী'
                  : 'Official Fleet Audit & Driver Settlement Statement (Currency: Taka ৳)'}
              </p>
            </div>
          </div>

          {/* Right/Bottom Metadata Box */}
          <div className="grid grid-cols-1 sm:flex sm:flex-col sm:text-right gap-1 p-2 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg border border-slate-200 sm:border-0 text-xs shrink-0 print:border-none print:p-0 print:bg-transparent">
            <div>
              <span className="text-slate-600 font-semibold">{isBangla ? 'ডক রেফারেন্স:' : 'Doc Ref:'}</span>{' '}
              <span className="font-mono-tabular font-bold text-slate-950">{statementDocId}</span>
            </div>
            <div>
              <span className="text-slate-600 font-semibold">{isBangla ? 'তৈরির সময়:' : 'Generated:'}</span>{' '}
              <span className="font-bold text-slate-950 whitespace-nowrap">{currentDate}</span>
            </div>
            <div className="pt-0.5 sm:pt-0">
              <span className="text-slate-600 font-semibold">{isBangla ? 'সময়কাল:' : 'Period:'}</span>{' '}
              <span className="font-extrabold text-slate-950 font-mono-tabular whitespace-nowrap">
                {formatDisplayDate(from)} {isBangla ? 'থেকে' : 'to'} {formatDisplayDate(to)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle and Driver Credentials Box (Clean Crisp Bordered Card) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 sm:p-3.5 bg-slate-50/90 border border-slate-300 mb-4 sm:mb-5 text-xs sm:text-sm rounded-xl print:rounded-none print:border-slate-400 print:bg-slate-50 print:p-2.5 print:mb-3">
        <div className="sm:border-r border-slate-200 sm:pr-2 min-w-0">
          <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold block tracking-wider">
            {isBangla ? 'লগইন নম্বর (Log in):' : 'Log in Number:'}
          </span>
          <span className="font-black text-sm sm:text-base text-slate-950 font-mono-tabular mt-0.5 block break-all">
            {profile.vehicle_number || 'N/A'}
          </span>
          {profile.vehicle_register_number && (
            <span className="text-xs text-slate-700 font-semibold block mt-0.5 break-all font-mono">
              {isBangla ? 'রেজিঃ' : 'Reg:'} {profile.vehicle_register_number}
            </span>
          )}
        </div>
        <div className="sm:border-r border-slate-200 sm:pr-2 min-w-0">
          <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold block tracking-wider">
            {isBangla ? 'চালকের নাম (Driver):' : 'Driver Name:'}
          </span>
          <span className="font-bold text-sm sm:text-base text-slate-950 mt-0.5 block break-words">
            {profile.name || 'N/A'}
          </span>
        </div>
        <div className="sm:border-r border-slate-200 sm:pr-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 min-w-0">
          <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold block tracking-wider">
            {isBangla ? 'ফোন নম্বর (Phone):' : 'Contact Phone:'}
          </span>
          <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono-tabular mt-0.5 block break-all">
            {profile.phone || 'N/A'}
          </span>
        </div>
        <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 min-w-0">
          <span className="text-[11px] sm:text-xs text-slate-600 uppercase font-bold block tracking-wider">
            {isBangla ? 'অ্যাকাউন্ট রোল / মুদ্রা:' : 'Role & Currency:'}
          </span>
          <span className="inline-block mt-1 font-extrabold text-xs uppercase px-2 py-0.5 bg-slate-200 text-slate-900 rounded print:bg-slate-200 border border-slate-300">
            {(profile.role || 'USER').toUpperCase()} · ৳ TAKA
          </span>
        </div>
      </div>

      {/* Financial Executive Summary Cards (Clean Defined Borders) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5 text-center print:mb-3 print:gap-2">
        {/* Box 1: Gross Income */}
        <div className="p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden print:rounded-none print:border-emerald-400 print:bg-emerald-50/40 print:p-2">
          <span className="text-[11px] sm:text-xs text-emerald-900 uppercase font-extrabold tracking-tight block leading-snug break-words">
            {isBangla ? 'মোট আয় (Gross Income)' : 'Gross Income (৳)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(incStr)} font-black font-mono-tabular text-emerald-950 my-1 block break-all leading-tight`}
          >
            {incStr}
          </span>
          <span className="text-[10px] sm:text-xs text-emerald-800 font-semibold block leading-snug break-words">
            {isBangla ? `${totals.entryCount} দিনের মোট জমা` : `${totals.entryCount} Days Revenue Logged`}
          </span>
        </div>

        {/* Box 2: Fuel & Direct Costs */}
        <div className="p-2.5 sm:p-3 bg-red-50/80 border border-red-300 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden print:rounded-none print:border-red-400 print:bg-red-50/40 print:p-2">
          <span className="text-[11px] sm:text-xs text-red-800 uppercase font-extrabold tracking-tight block leading-snug break-words">
            {isBangla ? 'জ্বালানি ও খরচ (Expense)' : 'Fuel & Costs (Expense)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(costStr)} font-black font-mono-tabular text-red-600 my-1 block break-all leading-tight`}
          >
            {costStr}
          </span>
          <span className="text-[10px] sm:text-xs text-red-800 font-semibold block leading-snug break-words">
            {isBangla ? 'জ্বালানি ও ইঞ্জিন ব্যয়' : 'Fuel & Engine Ops Cost'}
          </span>
        </div>

        {/* Box 3: Other Expenses */}
        <div className="p-2.5 sm:p-3 bg-red-50/80 border border-red-300 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden print:rounded-none print:border-red-400 print:bg-red-50/40 print:p-2">
          <span className="text-[11px] sm:text-xs text-red-800 uppercase font-extrabold tracking-tight block leading-snug break-words">
            {isBangla ? 'অন্যান্য খরচ (Expense)' : 'Other Costs (Expense)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(otherStr)} font-black font-mono-tabular text-red-600 my-1 block break-all leading-tight`}
          >
            {otherStr}
          </span>
          <span className="text-[10px] sm:text-xs text-red-800 font-semibold block leading-snug break-words">
            {isBangla ? 'টোল ও আনুষঙ্গিক ব্যয়' : 'Tolls & Incidentals'}
          </span>
        </div>

        {/* Box 4: Net Settlement Balance */}
        <div className="p-2.5 sm:p-3 bg-slate-100 border-2 border-slate-900 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden print:rounded-none print:border-2 print:border-black print:bg-slate-100/70 print:p-2">
          <span className="text-[11px] sm:text-xs text-slate-900 uppercase font-black tracking-tight block leading-snug break-words">
            {isBangla ? 'নিট ব্যালেন্স (Net Balance)' : 'Net Settlement (৳)'}
          </span>
          <span
            className={`${getBoxAmountSizeClass(balStr)} font-black font-mono-tabular my-1 block break-all leading-tight ${
              totals.balance >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {balStr}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-slate-700 block leading-snug break-words">
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

      {/* Itemized Ledger Table (Crisp Bordered Design) */}
      <div className="border border-slate-300 rounded-xl overflow-x-auto mb-5 sm:mb-6 print:mb-3 print:overflow-visible print:border print:border-slate-400 print:rounded-none">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-900 font-extrabold text-slate-950 uppercase tracking-wider text-xs">
              <th className="py-2.5 px-2 text-center w-[15%] border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'তারিখ (Date)' : 'Date'}
              </th>
              <th className="py-2.5 px-2 text-right w-[17%] text-emerald-900 border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'আয় (Income ৳)' : 'Income (৳)'}
              </th>
              <th className="py-2.5 px-2 text-right w-[17%] text-red-700 bg-red-50/50 border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'খরচ (Cost ৳)' : 'Cost (Expense ৳)'}
              </th>
              <th className="py-2.5 px-2 w-[26%] border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'খরচের বিবরণ (Cost Details)' : 'Cost Details'}
              </th>
              <th className="py-2.5 px-2 text-right w-[12%] text-red-700 bg-red-50/50 border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'অন্যান্য (Other ৳)' : 'Other (Expense ৳)'}
              </th>
              <th className="py-2.5 px-2 text-right w-[13%]">
                {isBangla ? 'নিট ব্যালেন্স (৳)' : 'Net Balance (৳)'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.length > 0 ? (
              records.map((r, idx) => {
                const bal =
                  (Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0);

                // Combine all written details preserving line breaks
                const detailBlocks: string[] = [];
                if (r.cost_location?.trim()) detailBlocks.push(r.cost_location.trim());
                if (r.cost_details?.trim()) detailBlocks.push(r.cost_details.trim());
                if (r.other_details?.trim()) detailBlocks.push(r.other_details.trim());
                const fullDetailText = detailBlocks.join('\n');

                return (
                  <tr
                    key={r.id || idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} border-b border-slate-200 print:break-inside-avoid`}
                  >
                    <td className="py-2 px-2 font-mono-tabular font-bold text-slate-950 text-center whitespace-nowrap align-top text-xs sm:text-sm border-r border-slate-200 print:border-slate-300">
                      {formatDisplayDate(r.record_date)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-tabular font-bold text-emerald-900 whitespace-nowrap align-top text-xs sm:text-sm border-r border-slate-200 print:border-slate-300">
                      {formatCurrency(r.income, '৳')}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-tabular font-bold text-red-600 whitespace-nowrap align-top text-xs sm:text-sm border-r border-slate-200 print:border-slate-300">
                      {formatCurrency(r.cost, '৳')}
                    </td>
                    <td className="py-2 px-2 text-slate-900 font-medium text-xs sm:text-sm break-words whitespace-pre-line leading-relaxed align-top border-r border-slate-200 print:border-slate-300">
                      {fullDetailText ? (
                        <span>{fullDetailText}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-mono-tabular font-bold text-red-600 whitespace-nowrap align-top text-xs sm:text-sm border-r border-slate-200 print:border-slate-300">
                      {formatCurrency(r.other, '৳')}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-mono-tabular font-extrabold whitespace-nowrap align-top text-xs sm:text-sm ${
                        bal >= 0 ? 'text-slate-950' : 'text-red-600'
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
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="w-6 h-6 text-slate-400" />
                    <span className="font-bold text-sm text-slate-700">
                      {isBangla
                        ? 'এই সময়ের জন্য কোনো লেনদেন রেকর্ড পাওয়া যায়নি'
                        : 'No transactions recorded for this period'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDisplayDate(from)} {isBangla ? 'থেকে' : 'to'} {formatDisplayDate(to)}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* CRITICAL: tfoot has print:table-row-group to render ONLY on the last page of multi-page reports */}
          <tfoot className="border-t-2 border-b-2 border-slate-900 bg-slate-100 font-bold text-slate-950 text-xs sm:text-sm print:table-row-group print:break-inside-avoid">
            <tr>
              <td className="py-2.5 px-2 text-center font-black border-r border-slate-300 print:border-slate-400">
                {isBangla ? 'সর্বমোট (TOTALS)' : 'TOTALS'}
              </td>
              <td className="py-2.5 px-2 text-right font-mono-tabular font-black text-emerald-950 whitespace-nowrap border-r border-slate-300 print:border-slate-400">
                {formatCurrency(totals.income, '৳')}
              </td>
              <td className="py-2.5 px-2 text-right font-mono-tabular font-black text-red-600 whitespace-nowrap border-r border-slate-300 print:border-slate-400">
                {formatCurrency(totals.cost, '৳')}
              </td>
              <td className="py-2.5 px-2 text-center text-slate-400 font-normal border-r border-slate-300 print:border-slate-400">
                —
              </td>
              <td className="py-2.5 px-2 text-right font-mono-tabular font-black text-red-600 whitespace-nowrap border-r border-slate-300 print:border-slate-400">
                {formatCurrency(totals.other, '৳')}
              </td>
              <td
                className={`py-2.5 px-2 text-right font-mono-tabular font-black whitespace-nowrap ${
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
      <div className="mt-4 pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-1 text-center sm:text-left font-medium print:mt-3 print:pt-2">
        <span>
          FLEET-LEDGER Enterprise ·{' '}
          {isBangla ? 'অফিসিয়াল হিসাব নিষ্পত্তি বিবরণী' : 'Official Settlement Document'}
        </span>
        <span>
          Log in Number: {profile.vehicle_number}
          {profile.vehicle_register_number ? ` (Reg: ${profile.vehicle_register_number})` : ''}
        </span>
      </div>
    </div>
  );
};
