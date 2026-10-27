import React, { useState, useEffect } from 'react';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { supabase } from '../supabase';
import {
  formatCurrency,
  getTodayStr,
  getFirstDayOfMonthStr,
  getLastDayOfMonthStr,
  getLastMonthRange,
  getLast7DaysRange,
  exportRecordsToCSV,
  exportAllFinancialRecordsToCSV,
} from '../utils/formatters';
import { downloadLedgerPDF, printLedgerPDF } from '../utils/pdfGenerator';
import { executePrint } from '../utils/printHelper';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { PrintReportView } from './PrintReportView';
import { useLanguage } from '../context/LanguageContext';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Filter,
  DollarSign,
  Fuel,
  Wallet,
  Check,
  Eye,
  Settings2,
  AlertCircle,
} from 'lucide-react';

interface PdfGenerateViewProps {
  profile: Profile;
}

export const PdfGenerateView: React.FC<PdfGenerateViewProps> = ({ profile }) => {
  const { isBangla } = useLanguage();
  const [from, setFrom] = useState<string>(getFirstDayOfMonthStr());
  const [to, setTo] = useState<string>(getLastDayOfMonthStr());
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [isExportingAllCsv, setIsExportingAllCsv] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  // Statement custom settings
  const [statementTitle, setStatementTitle] = useState<string>('Vehicle Income & Operating Cost Ledger');
  const [statementNotes, setStatementNotes] = useState<string>('Official Settlement & Audit Statement');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const handleExportAllRecordsCSV = async () => {
    setIsExportingAllCsv(true);
    setBackupNotice(null);
    try {
      const { data } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', profile.id)
        .order('record_date', { ascending: true });

      const all = data || [];
      if (all.length === 0) {
        setBackupNotice('No records found to backup offline.');
        setTimeout(() => setBackupNotice(null), 4000);
        return;
      }
      const res = exportAllFinancialRecordsToCSV(all, {
        vehicleNumber: profile.vehicle_number,
        driverName: profile.name,
      });
      setBackupNotice(`Exported ${res.count} records to ${res.filename} for offline backup.`);
      setTimeout(() => setBackupNotice(null), 5000);
    } catch (err) {
      console.error('Failed to backup all CSV:', err);
    } finally {
      setIsExportingAllCsv(false);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', profile.id)
        .gte('record_date', from)
        .lte('record_date', to)
        .order('record_date', { ascending: true });

      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load records for statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [profile.id, from, to]);

  // Aggregate totals
  const totals: RecordTotals = React.useMemo(() => {
    const inc = records.reduce((acc, r) => acc + (Number(r.income) || 0), 0);
    const cst = records.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const oth = records.reduce((acc, r) => acc + (Number(r.other) || 0), 0);
    const bal = inc - cst - oth;
    const margin = inc > 0 ? (bal / inc) * 100 : 0;
    return {
      income: inc,
      cost: cst,
      other: oth,
      balance: bal,
      entryCount: records.length,
      marginPercent: margin,
    };
  }, [records]);

  const handleDownloadPdf = async (): Promise<boolean> => {
    setIsGeneratingPdf(true);
    try {
      const success = await downloadLedgerPDF({
        profile,
        records,
        totals,
        from,
        to,
        language: isBangla ? 'bn' : 'en',
      });
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3500);
      }
      return success;
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      return false;
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 500);
    }
  };

  // High-reliability print handler: triggers A4 auto-print PDF + native browser print
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintNotice(
      isBangla
        ? 'A4 প্রিন্ট প্রস্তুত ও শুরু হচ্ছে...'
        : 'Preparing A4 print document...'
    );

    try {
      // 1. Generate the exact A4 PDF with autoPrint embedded, triggering print/save
      printLedgerPDF({
        profile,
        records,
        totals,
        from,
        to,
        language: isBangla ? 'bn' : 'en',
      });

      // 2. Also invoke native window.print() if outside an iframe
      await executePrint();

      setPrintNotice(
        isBangla
          ? 'A4 প্রিন্ট ডকুমেন্ট সফলভাবে প্রস্তুত হয়েছে!'
          : 'A4 print statement ready & opened!'
      );
    } catch (err) {
      console.error('Print action error:', err);
      await handleDownloadPdf();
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setPrintNotice(null);
      }, 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 no-print">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[11px] font-bold tracking-wider text-blue-300 uppercase bg-blue-500/20 px-1.5 py-0.5 sm:px-2 rounded">
              {isBangla ? 'অফিসিয়াল স্টেটমেন্ট ও হিসাব নিষ্পত্তি (৳)' : 'Statement & Settlement Document (৳)'}
            </span>
            <span className="text-[9px] sm:text-[11px] font-mono-tabular px-1.5 py-0.5 sm:px-2 bg-white/10 text-slate-200 rounded">
              {profile.vehicle_number}
            </span>
          </div>
          <h1 className="text-base sm:text-2xl font-black tracking-tight mt-0.5 sm:mt-1">
            {isBangla ? 'অফিসিয়াল পিডিএফ স্টেটমেন্ট তৈরি করুন (FLEET-LEDGER)' : 'Generate Official PDF Statement (FLEET-LEDGER)'}
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-300 mt-0.5 sm:mt-1 max-w-2xl line-clamp-2 sm:line-clamp-none">
            {isBangla
              ? 'তারিখ নির্বাচন করুন, আপনার খতিয়ান প্রিভিউ দেখুন এবং টাকা (৳) চিহ্নসহ সম্পূর্ণ পিডিএফ রিপোর্ট ডাউনলোড বা প্রিন্ট করুন।'
              : 'Configure report date range, preview your formal financial statement, and generate crisp, downloadable PDF ledger documents in Taka (৳).'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold rounded-lg sm:rounded-xl shadow-md transition-all ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-75'
            }`}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{isBangla ? 'পিডিএফ ডাউনলোড হয়েছে!' : 'PDF Downloaded!'}</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>
                  {isGeneratingPdf
                    ? isBangla
                      ? 'তৈরি হচ্ছে...'
                      : 'Generating PDF...'
                    : isBangla
                    ? 'পিডিএফ ডাউনলোড করুন'
                    : 'Download PDF Statement'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-bold rounded-lg sm:rounded-xl border border-blue-500 transition-colors shadow-sm cursor-pointer disabled:opacity-75"
            title="Print or view A4 statement"
          >
            {isPrinting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-white" />
            )}
            <span>
              {isPrinting
                ? isBangla
                  ? 'প্রিন্ট হচ্ছে...'
                  : 'Printing...'
                : isBangla
                ? 'প্রিন্ট করুন'
                : 'Print A4'}
            </span>
          </button>

          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg sm:rounded-xl transition-colors shadow-xs"
            title="Share settlement statement via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleExportAllRecordsCSV}
            disabled={isExportingAllCsv}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg sm:rounded-xl transition-colors shadow-xs"
            title="Export all financial records to a CSV file to backup offline"
          >
            {isExportingAllCsv ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Backup All</span>
          </button>

          <button
            onClick={() => exportRecordsToCSV(records, profile.vehicle_number, profile.name, from, to)}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg sm:rounded-xl border border-white/20 transition-colors"
            title="Export current period as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Period CSV</span>
          </button>
        </div>
      </div>

      {printNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between no-print animate-fadeIn">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">{printNotice}</span>
          </div>
        </div>
      )}

      {backupNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between no-print animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{backupNotice}</span>
          </div>
        </div>
      )}

      {/* Date Range Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs no-print space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{isBangla ? 'স্টেটমেন্ট সময়কাল:' : 'Statement Period:'}</span>
            </span>

            <div className="flex items-center gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block">{isBangla ? 'হতে' : 'From'}</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-slate-400 mt-3 text-xs">{isBangla ? 'থেকে' : 'to'}</span>
              <div>
                <label className="text-[10px] text-slate-400 block">{isBangla ? 'পর্যন্ত' : 'To'}</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={loadRecords}
              className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {isBangla ? 'লোড করুন' : 'Load Period'}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => {
                setFrom(getFirstDayOfMonthStr());
                setTo(getLastDayOfMonthStr());
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-semibold border border-slate-200 shrink-0 text-xs transition-colors"
            >
              {isBangla ? 'চলতি মাস' : 'This Month'}
            </button>
            <button
              onClick={() => {
                const range = getLastMonthRange();
                setFrom(range.from);
                setTo(range.to);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-semibold border border-slate-200 shrink-0 text-xs transition-colors"
            >
              {isBangla ? 'গত মাস' : 'Last Month'}
            </button>
            <button
              onClick={() => {
                const range = getLast7DaysRange();
                setFrom(range.from);
                setTo(range.to);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-semibold border border-slate-200 shrink-0 text-xs transition-colors"
            >
              {isBangla ? 'বিগত ৭ দিন' : 'Last 7 Days'}
            </button>
            <button
              onClick={() => {
                setFrom('2020-01-01');
                setTo(getTodayStr());
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-semibold border border-slate-200 shrink-0 text-xs transition-colors"
            >
              {isBangla ? 'সব সময়' : 'All Time'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                showSettings ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Statement customization settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Header Title/Note Accordion */}
        {showSettings && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Statement Document Title:
              </label>
              <input
                type="text"
                value={statementTitle}
                onChange={e => setStatementTitle(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Settlement Subtitle / Auditor Note:
              </label>
              <input
                type="text"
                value={statementNotes}
                onChange={e => setStatementNotes(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Statement Executive Financial Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 no-print">
        <div className="bg-white border border-emerald-200 rounded-xl p-3 sm:p-3.5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-semibold gap-1">
            <span className="truncate">{isBangla ? 'মোট আয় (Gross Income)' : 'Gross Income (৳)'}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-1 text-sm sm:text-lg md:text-xl font-black font-mono-tabular text-emerald-950 break-all leading-tight">
            {formatCurrency(totals.income, '৳')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {isBangla ? `${totals.entryCount} দিনের মোট জমা` : `${totals.entryCount} itemized trip entries`}
          </div>
        </div>

        <div className="bg-red-50/40 border border-red-200 rounded-xl p-3 sm:p-3.5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-red-800 text-[11px] font-semibold gap-1">
            <span className="truncate">{isBangla ? 'জ্বালানি ও খরচ (Cost)' : 'Fuel & Direct Costs (৳)'}</span>
            <Fuel className="w-3.5 h-3.5 text-red-600 shrink-0" />
          </div>
          <div className="mt-1 text-sm sm:text-lg md:text-xl font-black font-mono-tabular text-red-600 break-all leading-tight">
            {formatCurrency(totals.cost, '৳')}
          </div>
          <div className="text-[10px] text-red-700/80 mt-1 truncate">
            {isBangla ? 'জ্বালানি ও ইঞ্জিন রক্ষণাবেক্ষণ ব্যয়' : 'Fuel refills & engine maintenance'}
          </div>
        </div>

        <div className="bg-red-50/40 border border-red-200 rounded-xl p-3 sm:p-3.5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-red-800 text-[11px] font-semibold gap-1">
            <span className="truncate">{isBangla ? 'অন্যান্য খরচ (Other Cost)' : 'Other Incidentals (৳)'}</span>
            <Wallet className="w-3.5 h-3.5 text-red-600 shrink-0" />
          </div>
          <div className="mt-1 text-sm sm:text-lg md:text-xl font-black font-mono-tabular text-red-600 break-all leading-tight">
            {formatCurrency(totals.other, '৳')}
          </div>
          <div className="text-[10px] text-red-700/80 mt-1 truncate">
            {isBangla ? 'টোল, পারমিট ও আনুষঙ্গিক ব্যয়' : 'Tolls, permits, parking & fines'}
          </div>
        </div>

        <div className={`border rounded-xl p-3 sm:p-3.5 shadow-xs min-w-0 overflow-hidden ${
          totals.balance >= 0 ? 'bg-white border-emerald-300' : 'bg-rose-50/60 border-rose-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 gap-1">
            <span className="truncate">{isBangla ? 'নিট ব্যালেন্স (Net Balance)' : 'Net Settlement (৳)'}</span>
            <span className="text-[10px] font-mono-tabular px-1.5 py-0.2 rounded bg-slate-100 shrink-0">
              {totals.marginPercent.toFixed(1)}%
            </span>
          </div>
          <div className={`mt-1 text-sm sm:text-lg md:text-xl font-black font-mono-tabular break-all leading-tight ${
            totals.balance >= 0 ? 'text-emerald-700' : 'text-red-600'
          }`}>
            {formatCurrency(totals.balance, '৳')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {totals.balance >= 0
              ? isBangla
                ? 'নিট উদ্বৃত্ত / লাভ'
                : 'Net Surplus Payable'
              : isBangla
              ? 'পরিচালন ঘাটতি'
              : 'Deficit / Overdrawn'}
          </div>
        </div>
      </div>

      {/* Live On-Screen Document Statement Preview */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between no-print gap-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Statement Preview (Exact PDF Representation)
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                A4 Print Layout · Printable &amp; Archival (210 × 297 mm)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-75"
              title="Print document on A4 paper"
            >
              {isPrinting ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{isPrinting ? (isBangla ? 'প্রিন্ট হচ্ছে...' : 'Printing...') : (isBangla ? 'প্রিন্ট A4' : 'Print A4')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-lg shadow-2xs transition-colors"
              title="Download exact matching PDF statement"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* On-screen visual container (hidden during browser print) */}
        <div className="bg-slate-200/80 p-1.5 sm:p-6 md:p-8 rounded-2xl border border-slate-300 shadow-inner overflow-x-auto print:hidden">
          <div className="max-w-[210mm] mx-auto">
            <PrintReportView
              profile={profile}
              records={records}
              totals={totals}
              from={from}
              to={to}
              screenPreview={true}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Clean Layout for Browser Print Command */}
      <div className="print-only">
        <PrintReportView
          profile={profile}
          records={records}
          totals={totals}
          from={from}
          to={to}
          screenPreview={false}
        />
      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        profile={profile}
        records={records}
        totals={totals}
        from={from}
        to={to}
      />
    </div>
  );
};
