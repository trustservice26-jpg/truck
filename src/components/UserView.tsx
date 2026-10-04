import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { supabase } from '../supabase';
import { StatsCards } from './StatsCards';
import { RecordForm } from './RecordForm';
import { RecordTable } from './RecordTable';
import { PrintReportView } from './PrintReportView';
import {
  formatCurrency,
  getTodayStr,
  getFirstDayOfMonthStr,
  getLastMonthRange,
  getLast7DaysRange,
  exportRecordsToCSV,
  exportAllFinancialRecordsToCSV,
} from '../utils/formatters';
import { downloadLedgerPDF } from '../utils/pdfGenerator';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { MonthlyOverview } from './MonthlyOverview';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Filter, RotateCcw, Download, Printer, PlusCircle, FileText, CheckCircle2, MessageSquare, BookOpen, BarChart3, AlertCircle, Globe } from 'lucide-react';

interface UserViewProps {
  profile: Profile;
  activeTab?: 'ledger' | 'reports';
  onNavigateToPdf?: () => void;
  onNavigateToOverview?: () => void;
}

export const UserView: React.FC<UserViewProps> = ({
  profile,
  activeTab = 'ledger',
  onNavigateToPdf,
  onNavigateToOverview,
}) => {
  const { t, isBangla } = useLanguage();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppSingleDate, setWhatsAppSingleDate] = useState<string | undefined>(undefined);
  const [isExportingAllCsv, setIsExportingAllCsv] = useState<boolean>(false);
  const [backupNotification, setBackupNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    filename?: string;
    count?: number;
  } | null>(null);

  const handleOpenWhatsApp = (date?: string) => {
    setWhatsAppSingleDate(date);
    setIsWhatsAppOpen(true);
  };

  // Date filters
  const [from, setFrom] = useState<string>(getFirstDayOfMonthStr());
  const [to, setTo] = useState<string>(getTodayStr());

  // Load records
  const loadRecords = async () => {
    setLoading(true);
    const { data, x } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', profile.id)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false });

    setRecords(data || x || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, [profile.id, from, to]);

  const handleSaveRecord = async (
    payload: Omit<DailyRecord, 'id' | 'created_at'>
  ): Promise<string | null> => {
    if (editingRecord) {
      const { error } = await supabase
        .from('daily_records')
        .update(payload)
        .eq('id', editingRecord.id);
      if (error) return error.message;
      setEditingRecord(null);
    } else {
      const { error } = await supabase.from('daily_records').insert(payload);
      if (error) return error.message;
    }
    loadRecords();
    return null;
  };

  const handleDeleteRecord = async (recordId: string) => {
    // Optimistically remove record immediately for instant UI responsiveness
    setRecords(prev => prev.filter(r => r.id !== recordId));
    try {
      const { error } = await supabase.from('daily_records').delete().eq('id', recordId);
      if (error) {
        console.error('Delete error from database:', error);
      }
    } catch (err) {
      console.error('Failed to execute delete on record:', err);
    } finally {
      loadRecords();
    }
  };

  const handleClearFilters = () => {
    setFrom(getFirstDayOfMonthStr());
    setTo(getTodayStr());
  };

  // Calculate summary stats
  const totals: RecordTotals = useMemo(() => {
    const t = records.reduce(
      (acc, r) => ({
        income: acc.income + (Number(r.income) || 0),
        cost: acc.cost + (Number(r.cost) || 0),
        other: acc.other + (Number(r.other) || 0),
        entryCount: acc.entryCount + 1,
      }),
      { income: 0, cost: 0, other: 0, entryCount: 0 }
    );
    const balance = t.income - t.cost - t.other;
    const marginPercent = t.income > 0 ? (balance / t.income) * 100 : 0;
    return { ...t, balance, marginPercent };
  }, [records]);

  const handleExportAllRecordsCSV = async () => {
    setIsExportingAllCsv(true);
    setBackupNotification(null);
    try {
      // Query ALL historical financial records for this user (unfiltered by date)
      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', profile.id)
        .order('record_date', { ascending: true });

      if (error) {
        console.error('Failed to query all records for offline backup:', error);
        setBackupNotification({
          type: 'error',
          message: 'Failed to retrieve records for offline backup. Please try again.',
        });
        return;
      }

      const allRecords: DailyRecord[] = data || [];
      if (allRecords.length === 0) {
        setBackupNotification({
          type: 'info',
          message: 'No financial records found to backup yet. Add an entry first.',
          count: 0,
        });
        setTimeout(() => setBackupNotification(null), 4000);
        return;
      }

      const result = exportAllFinancialRecordsToCSV(allRecords, {
        vehicleNumber: profile.vehicle_number,
        driverName: profile.name,
      });

      setBackupNotification({
        type: 'success',
        message: `Offline Backup Complete: ${result.count} total records exported to ${result.filename}`,
        filename: result.filename,
        count: result.count,
      });
      setTimeout(() => setBackupNotification(null), 6000);
    } catch (err) {
      console.error('Export all CSV backup error:', err);
      setBackupNotification({
        type: 'error',
        message: 'Unexpected error exporting CSV offline backup.',
      });
    } finally {
      setIsExportingAllCsv(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);
    try {
      const success = downloadLedgerPDF({
        profile,
        records,
        totals,
        from,
        to,
      });
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 600);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Driver Header Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {isBangla ? 'গাড়ি:' : 'Vehicle:'} {profile.vehicle_number}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 truncate">
              {profile.name}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {t('dailyFinancialRecords')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBangla
              ? 'দৈনিক ট্রিপ ভাড়া, জ্বালানি/তেল খরচ, এক্সপ্রেসওয়ে টোল ও অন্যান্য ব্যয়ের হিসাব খতিয়ান (মুদ্রা: ৳ টাকা)।'
              : 'Log daily trip revenue, fuel fill-ups, expressway tolls, and vehicle running expenses (Currency: ৳ Taka).'}
          </p>
        </div>
      </div>

      {/* Date Range & Preset Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Inputs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{isBangla ? 'সময়কাল:' : 'Period:'}</span>
            </span>
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <div className="flex-1 sm:flex-none">
                <label className="text-[10px] text-slate-400 block">{isBangla ? 'শুরু' : 'From'}</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-slate-400 mt-3 text-xs">{isBangla ? 'হতে' : 'to'}</span>
              <div className="flex-1 sm:flex-none">
                <label className="text-[10px] text-slate-400 block">{isBangla ? 'শেষ' : 'To'}</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 sm:mt-3 w-full sm:w-auto">
              <button
                onClick={loadRecords}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-center"
              >
                {isBangla ? 'প্রয়োগ' : 'Apply'}
              </button>
              <button
                onClick={handleClearFilters}
                className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-center border border-slate-200 sm:border-transparent"
              >
                {isBangla ? 'রিসেট' : 'Reset'}
              </button>
            </div>
          </div>

          {/* Quick preset chips - Horizontally swipeable on mobile */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 max-w-full no-scrollbar">
            <span className="text-[11px] text-slate-400 shrink-0">{t('presets')}</span>
            <button
              onClick={() => {
                setFrom(getFirstDayOfMonthStr());
                setTo(getTodayStr());
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-xs"
            >
              {t('thisMonth')}
            </button>
            <button
              onClick={() => {
                const range = getLastMonthRange();
                setFrom(range.from);
                setTo(range.to);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-xs"
            >
              {t('lastMonth')}
            </button>
            <button
              onClick={() => {
                const range = getLast7DaysRange();
                setFrom(range.from);
                setTo(range.to);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-xs"
            >
              {t('last7Days')}
            </button>
            <button
              onClick={() => {
                setFrom(getTodayStr());
                setTo(getTodayStr());
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-xs"
            >
              {t('today')}
            </button>
            <button
              onClick={() => {
                setFrom('2025-01-01');
                setTo(getTodayStr());
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0 text-xs"
            >
              {t('allTime')}
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="no-print">
        <StatsCards totals={totals} subtext={`${profile.vehicle_number}`} />
      </div>

      {activeTab === 'reports' ? (
        /* Dedicated Reports & Audit View */
        <div className="space-y-6 no-print">
          {/* Monthly Overview Section with Recharts Bar Chart */}
          <MonthlyOverview
            userId={profile.id}
            vehicleNumber={profile.vehicle_number}
            currentRecords={records}
          />

          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-blue-300 uppercase">
                Official Ledger Statement &amp; Settlement
              </span>
              <h2 className="text-base sm:text-xl font-bold mt-0.5">
                Financial Audit Report: {profile.vehicle_number}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                Period: {from} to {to} · {records.length} transactions recorded
              </p>
            </div>
            <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className={`flex items-center justify-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-colors ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-75'
                }`}
              >
                {downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleOpenWhatsApp()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleExportAllRecordsCSV}
                disabled={isExportingAllCsv}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                title="Export all financial records to a CSV file to backup your data offline"
              >
                {isExportingAllCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Backup All (CSV)</span>
              </button>
              <button
                onClick={() => exportRecordsToCSV(records, profile.vehicle_number, profile.name, from, to)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-colors border border-white/20"
                title="Export current filtered date range as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Period CSV</span>
              </button>
            </div>
          </div>

          {/* Dedicated Offline Data Backup Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                  <Download className="w-4 h-4" />
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Offline Data Backup &amp; CSV Spreadsheet Export
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                Export all historical daily financial records (revenues, fuel fill-ups, toll expenses, and repairs) to an offline CSV file. This backup file can be stored offline on your device, computer, or drive, and opened in Microsoft Excel, Google Sheets, or Apple Numbers anytime.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportAllRecordsCSV}
                disabled={isExportingAllCsv}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 rounded-xl shadow-xs transition-colors"
                title="Export all financial records to a CSV file to backup your data offline"
              >
                {isExportingAllCsv ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Backup All Records (CSV)</span>
              </button>
            </div>
          </div>

          {/* On-screen Statement Document Preview */}
          <PrintReportView
            profile={profile}
            records={records}
            totals={totals}
            from={from}
            to={to}
            screenPreview={true}
          />
        </div>
      ) : (
        /* Daily Record Entry & Ledger View */
        <>
          {/* Daily Record Entry Form */}
          <div className="no-print">
            <RecordForm
              onSave={handleSaveRecord}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
              userId={profile.id}
            />
          </div>

          {/* Itemized Records Table */}
          <div className="no-print">
            <RecordTable
              records={records}
              onEdit={rec => setEditingRecord(rec)}
              onDelete={handleDeleteRecord}
              onShareWhatsApp={handleOpenWhatsApp}
              canEdit={true}
            />
          </div>
        </>
      )}

      {/* Hidden layout for browser print command */}
      <PrintReportView
        profile={profile}
        records={records}
        totals={totals}
        from={from}
        to={to}
      />

      {/* WhatsApp Sharing Configuration Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        profile={profile}
        records={records}
        totals={totals}
        from={from}
        to={to}
        defaultSingleDate={whatsAppSingleDate}
      />
    </div>
  );
};
