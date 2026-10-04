import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { supabase } from '../supabase';
import { StatsCards } from './StatsCards';
import { RecordTable } from './RecordTable';
import { RecordForm } from './RecordForm';
import { PrintReportView } from './PrintReportView';
import { formatCurrency, exportRecordsToCSV, exportAllFinancialRecordsToCSV, getFirstDayOfMonthStr, getTodayStr } from '../utils/formatters';
import { downloadLedgerPDF } from '../utils/pdfGenerator';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { MonthlyOverview } from './MonthlyOverview';
import { useLanguage } from '../context/LanguageContext';
import { Users, Truck, Shield, ArrowLeft, Printer, Download, Plus, Search, Calendar, FileText, CheckCircle2, AlertCircle, MessageSquare, Lock, Trash2, UserX } from 'lucide-react';

interface AdminViewProps {
  currentAdmin: Profile;
  onLogout: () => void;
  onLockAdmin?: () => void;
  onSubViewChange?: (hasSelectedUser: boolean) => void;
  backSignal?: number;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentAdmin,
  onLogout,
  onLockAdmin,
  onSubViewChange,
  backSignal = 0,
}) => {
  const { t, isBangla } = useLanguage();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppSingleDate, setWhatsAppSingleDate] = useState<string | undefined>(undefined);
  const [isExportingVehicleCsv, setIsExportingVehicleCsv] = useState<boolean>(false);
  const [isExportingFleetCsv, setIsExportingFleetCsv] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  const handleOpenWhatsApp = (date?: string) => {
    setWhatsAppSingleDate(date);
    setIsWhatsAppOpen(true);
  };

  // Selected user date filters
  const [from, setFrom] = useState<string>(getFirstDayOfMonthStr());
  const [to, setTo] = useState<string>(getTodayStr());

  // Load all users
  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // When a user is selected, load their daily records
  const loadUserRecords = async (userId: string) => {
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', userId)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false });
    setRecords(data || []);
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserRecords(selectedUser.id);
    }
    onSubViewChange?.(Boolean(selectedUser));
  }, [selectedUser, from, to]);

  useEffect(() => {
    if (backSignal > 0 && selectedUser) {
      setSelectedUser(null);
      setEditingRecord(null);
    }
  }, [backSignal]);

  const handleSelectUser = (user: Profile) => {
    setSelectedUser(user);
    setEditingRecord(null);
  };

  const handleBackToFleet = () => {
    setSelectedUser(null);
    setEditingRecord(null);
  };

  const handleSaveRecord = async (payload: Omit<DailyRecord, 'id' | 'created_at'>): Promise<string | null> => {
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
    if (selectedUser) {
      loadUserRecords(selectedUser.id);
    }
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
      if (selectedUser) {
        loadUserRecords(selectedUser.id);
      }
    }
  };

  const handleToggleRole = async (user: Profile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (user.id === currentAdmin.id) {
      setAdminNotice("You cannot change your own administrator status.");
      setTimeout(() => setAdminNotice(null), 3500);
      return;
    }
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    loadUsers();
    if (selectedUser?.id === user.id) {
      setSelectedUser({ ...selectedUser, role: newRole });
    }
  };

  const handleDeleteUser = async (user: Profile) => {
    setIsDeletingUser(true);
    setAdminNotice(null);
    try {
      // 1. Delete associated daily financial records
      await supabase.from('daily_records').delete().eq('user_id', user.id);
      // 2. Delete associated login history
      await supabase.from('login_history').delete().eq('user_id', user.id);
      // 3. Delete profile from database
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);

      if (error) {
        setAdminNotice(`Failed to delete vehicle account: ${error.message}`);
        setIsDeletingUser(false);
        setUserToDelete(null);
        return;
      }

      setAdminNotice(`✅ Vehicle ${user.vehicle_number} (${user.name}) deleted successfully.`);
      setTimeout(() => setAdminNotice(null), 4000);

      // If user deleted was selected drilldown, return to fleet directory
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }

      // If deleted account is the currently logged-in user, notify and logout
      if (user.id === currentAdmin.id) {
        setAdminNotice(`Logged-in user ${user.vehicle_number} deleted. Logging you out...`);
        setTimeout(() => {
          onLogout();
        }, 1200);
      } else {
        loadUsers();
      }
    } catch (err: any) {
      setAdminNotice(`Error deleting account: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedUser) return;
    setIsGeneratingPdf(true);
    try {
      downloadLedgerPDF({
        profile: selectedUser,
        records,
        totals: selectedUserTotals,
        from,
        to,
      });
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 800);
    }
  };

  const handleBackupSelectedVehicleCSV = async () => {
    if (!selectedUser) return;
    setIsExportingVehicleCsv(true);
    setAdminNotice(null);
    try {
      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('record_date', { ascending: true });

      if (error) {
        setAdminNotice('Failed to retrieve vehicle records for offline backup.');
        return;
      }

      const all = data || [];
      if (all.length === 0) {
        setAdminNotice('No financial records found for this vehicle.');
        setTimeout(() => setAdminNotice(null), 4000);
        return;
      }

      const res = exportAllFinancialRecordsToCSV(all, {
        vehicleNumber: selectedUser.vehicle_number,
        driverName: selectedUser.name,
      });

      setAdminNotice(`✅ Backup completed: ${res.count} records exported to ${res.filename}`);
      setTimeout(() => setAdminNotice(null), 5000);
    } catch (err) {
      console.error('Error backing up vehicle records:', err);
    } finally {
      setIsExportingVehicleCsv(false);
    }
  };

  const handleBackupEntireFleetCSV = async () => {
    setIsExportingFleetCsv(true);
    setAdminNotice(null);
    try {
      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .order('record_date', { ascending: true });

      if (error) {
        setAdminNotice('Failed to retrieve fleet records for offline backup.');
        return;
      }

      const allRecords: DailyRecord[] = data || [];
      if (allRecords.length === 0) {
        setAdminNotice('No fleet financial records found to backup.');
        setTimeout(() => setAdminNotice(null), 4000);
        return;
      }

      const userMap = new Map(users.map(u => [u.id, u]));
      const today = getTodayStr();
      const headers = [
        'Record ID',
        'Date',
        'Vehicle Number',
        'Driver',
        'Income ($)',
        'Income Details',
        'Direct Cost / Fuel ($)',
        'Cost / Fuel Location',
        'Cost Details',
        'Other Expense ($)',
        'Other Details',
        'Total Operating Expenses ($)',
        'Net Profit / Balance ($)',
        'Profit Margin (%)',
        'Created Timestamp'
      ];

      const escapeVal = (val: any) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      const rows = allRecords.map(r => {
        const u = userMap.get(r.user_id);
        const vNum = u ? u.vehicle_number : 'UNKNOWN';
        const dName = u ? u.name : 'UNKNOWN';
        const income = Number(r.income) || 0;
        const cost = Number(r.cost) || 0;
        const other = Number(r.other) || 0;
        const totalExpenses = cost + other;
        const balance = income - totalExpenses;
        const margin = income > 0 ? ((balance / income) * 100).toFixed(1) + '%' : '0.0%';

        return [
          escapeVal(r.id),
          escapeVal(r.record_date),
          escapeVal(vNum),
          escapeVal(dName),
          income.toFixed(2),
          escapeVal(r.income_details || ''),
          cost.toFixed(2),
          escapeVal(r.cost_location || ''),
          escapeVal(r.cost_details || ''),
          other.toFixed(2),
          escapeVal(r.other_details || ''),
          totalExpenses.toFixed(2),
          balance.toFixed(2),
          escapeVal(margin),
          escapeVal(r.created_at || '')
        ].join(',');
      });

      const totals = allRecords.reduce(
        (acc, r) => ({
          income: acc.income + (Number(r.income) || 0),
          cost: acc.cost + (Number(r.cost) || 0),
          other: acc.other + (Number(r.other) || 0),
        }),
        { income: 0, cost: 0, other: 0 }
      );
      const totalExpenses = totals.cost + totals.other;
      const totalBalance = totals.income - totalExpenses;
      const totalMargin = totals.income > 0 ? ((totalBalance / totals.income) * 100).toFixed(1) + '%' : '0.0%';

      const summaryRow = [
        escapeVal('FLEET MASTER BACKUP TOTALS'),
        escapeVal(`${allRecords.length} Total Records`),
        escapeVal(`${users.length} Total Vehicles`),
        escapeVal('ALL DRIVERS'),
        totals.income.toFixed(2),
        escapeVal('Total Fleet Income'),
        totals.cost.toFixed(2),
        escapeVal(''),
        escapeVal('Total Direct Costs'),
        totals.other.toFixed(2),
        escapeVal('Total Other Expenses'),
        totalExpenses.toFixed(2),
        totalBalance.toFixed(2),
        escapeVal(totalMargin),
        escapeVal(`Exported ${new Date().toISOString()}`)
      ].join(',');

      const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `FleetLedger_FLEET_MASTER_BACKUP_${today}_all_records.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAdminNotice(`✅ Fleet backup complete: ${allRecords.length} records exported to ${filename}`);
      setTimeout(() => setAdminNotice(null), 5000);
    } catch (err) {
      console.error('Error backing up fleet records:', err);
    } finally {
      setIsExportingFleetCsv(false);
    }
  };

  // Selected user totals
  const selectedUserTotals: RecordTotals = useMemo(() => {
    const totals = records.reduce(
      (acc, r) => ({
        income: acc.income + (Number(r.income) || 0),
        cost: acc.cost + (Number(r.cost) || 0),
        other: acc.other + (Number(r.other) || 0),
        entryCount: acc.entryCount + 1,
      }),
      { income: 0, cost: 0, other: 0, entryCount: 0 }
    );
    const balance = totals.income - totals.cost - totals.other;
    const marginPercent = totals.income > 0 ? (balance / totals.income) * 100 : 0;
    return { ...totals, balance, marginPercent };
  }, [records]);

  // Filtered users directory
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.vehicle_number.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.phone.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* If a user is selected, show their drilldown */}
      {selectedUser ? (
        <div className="space-y-6">
          {/* Back bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToFleet}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Back to fleet list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Log in Number:</span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono-tabular">
                    {selectedUser.vehicle_number}
                  </h1>
                  {selectedUser.vehicle_register_number && (
                    <span className="text-xs font-mono-tabular px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      Reg: {selectedUser.vehicle_register_number}
                    </span>
                  )}
                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {selectedUser.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    selectedUser.role === 'admin' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                  }`}>
                    {selectedUser.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Driver Phone: <span className="font-mono-tabular">{selectedUser.phone}</span> · Vehicle Financial Audit
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleBackupSelectedVehicleCSV}
                disabled={isExportingVehicleCsv}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
                title="Export all financial records for this vehicle to a CSV file to backup offline"
              >
                {isExportingVehicleCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>Backup CSV (All)</span>
              </button>

              <button
                onClick={() => handleOpenWhatsApp()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                title="Share this driver statement on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => exportRecordsToCSV(records, selectedUser.vehicle_number, selectedUser.name, from, to)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                title="Export current period as CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Period CSV</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-lg transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Generating...' : 'PDF Statement'}</span>
              </button>
              <button
                onClick={() => setUserToDelete(selectedUser)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors shadow-2xs"
                title="Delete this vehicle and user account"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Vehicle</span>
              </button>
              <button
                onClick={() => window.print()}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                title="Browser print dialog"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {adminNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{adminNotice}</span>
            </div>
          )}

          {/* Date range filter strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 no-print shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Audit Period:
              </span>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono-tabular text-xs focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono-tabular text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => {
                  setFrom(getFirstDayOfMonthStr());
                  setTo(getTodayStr());
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  setFrom('2026-01-01');
                  setTo(getTodayStr());
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Monthly Overview Section with Recharts Bar Chart */}
          <div className="no-print">
            <MonthlyOverview
              userId={selectedUser.id}
              vehicleNumber={selectedUser.vehicle_number}
              currentRecords={records}
            />
          </div>

          {/* Vehicle Stats Cards */}
          <div className="no-print">
            <StatsCards totals={selectedUserTotals} subtext={`${selectedUser.vehicle_number}`} />
          </div>

          {/* Add / Edit record for this vehicle */}
          <div className="no-print">
            <RecordForm
              onSave={handleSaveRecord}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
              userId={selectedUser.id}
            />
          </div>

          {/* Records Ledger Table */}
          <div className="no-print">
            <RecordTable
              records={records}
              onEdit={rec => setEditingRecord(rec)}
              onDelete={handleDeleteRecord}
              onShareWhatsApp={handleOpenWhatsApp}
              onExportAllCSV={handleBackupSelectedVehicleCSV}
              canEdit={true}
            />
          </div>

          {/* Dedicated Print View for window.print() */}
          <PrintReportView
            profile={selectedUser}
            records={records}
            totals={selectedUserTotals}
            from={from}
            to={to}
          />

          {/* WhatsApp Sharing Configuration Modal for Selected Vehicle */}
          <WhatsAppShareModal
            isOpen={isWhatsAppOpen}
            onClose={() => setIsWhatsAppOpen(false)}
            profile={selectedUser}
            records={records}
            totals={selectedUserTotals}
            from={from}
            to={to}
            defaultSingleDate={whatsAppSingleDate}
          />
        </div>
      ) : (
        /* Fleet Master Directory View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t('fleetAdminTitle')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('fleetAdminSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onLockAdmin && (
                <button
                  onClick={onLockAdmin}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs"
                  title="Lock admin section and return to daily ledger"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t('lockAndExitAdmin')}</span>
                </button>
              )}

              <button
                onClick={handleBackupEntireFleetCSV}
                disabled={isExportingFleetCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
                title="Export all financial records for all fleet vehicles to a CSV file to backup offline"
              >
                {isExportingFleetCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>{t('backupFleetCsv')}</span>
              </button>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('registerNewVehicle')}</span>
              </button>
            </div>
          </div>

          {adminNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{adminNotice}</span>
              </div>
              <button
                onClick={() => setAdminNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-base leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vehicle number, driver name, phone..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono-tabular">
              {filteredUsers.length} total active vehicles
            </div>
          </div>

          {/* Fleet Vehicles Table & Mobile Cards */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Loading vehicle fleet registry...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No vehicles found matching "{userSearch}".
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-mono-tabular font-bold text-slate-900 text-sm block">
                            {user.vehicle_number}
                          </span>
                          {user.vehicle_register_number && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Reg: {user.vehicle_register_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRole(user)}
                        title="Click to toggle User/Admin role"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Driver:</span>
                        <span className="font-semibold text-slate-800">{user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="font-mono-tabular text-slate-700">{user.phone || '—'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="flex-1 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-center"
                      >
                        View Vehicle Ledger &amp; Audit
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="px-2.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center justify-center gap-1"
                        title={`Delete vehicle account ${user.vehicle_number}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop / Tablet Table (>= md) */}
            <table className="hidden md:table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t('vehicleNumber')}</th>
                  <th className="py-3 px-4">{t('driverName')}</th>
                  <th className="py-3 px-4">{t('phoneNumber')}</th>
                  <th className="py-3 px-4">{t('role')}</th>
                  <th className="py-3 px-4 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading vehicle fleet registry...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No vehicles found matching "{userSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{user.vehicle_number}</span>
                          {user.id === currentAdmin.id && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">
                              You
                            </span>
                          )}
                        </div>
                        {user.vehicle_register_number && (
                          <div className="text-[10px] text-slate-500 font-normal font-mono">
                            Reg: {user.vehicle_register_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {user.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-slate-600">
                        {user.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleRole(user)}
                          title="Click to toggle User/Admin role"
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            user.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectUser(user)}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                          >
                            View Ledger
                          </button>
                          <button
                            onClick={() => setUserToDelete(user)}
                            title={`Delete vehicle account ${user.vehicle_number}`}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal to Register New Vehicle as Admin */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Register New Commercial Vehicle</h3>
            <p className="text-xs text-slate-500 mb-4">Add a new vehicle and driver profile into the fleet ledger.</p>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const vehicle_number = (form.elements.namedItem('vNum') as HTMLInputElement).value.trim().toUpperCase();
                const vehicle_register_number = (form.elements.namedItem('vRegNum') as HTMLInputElement).value.trim().toUpperCase();
                const name = (form.elements.namedItem('dName') as HTMLInputElement).value.trim();
                const phone = (form.elements.namedItem('dPhone') as HTMLInputElement).value.trim();
                const password = (form.elements.namedItem('dPass') as HTMLInputElement).value.trim() || 'password123';

                const res = await supabase.auth.signUp({
                  email: `${vehicle_number.toLowerCase()}@vehicle.local`,
                  password,
                  options: { data: { vehicle_number, vehicle_register_number, name, phone } },
                });

                if (res.error) {
                  alert(res.error.message);
                } else {
                  setShowAddUserModal(false);
                  loadUsers();
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Log in Number *</label>
                <input
                  name="vNum"
                  required
                  placeholder="e.g. 1483 or USR-101"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle register Number *</label>
                <input
                  name="vRegNum"
                  required
                  placeholder="e.g. DHAKA-METRO-GA-12-3456"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono-tabular uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Driver Name</label>
                <input
                  name="dName"
                  required
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  name="dPhone"
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password (optional)</label>
                <input
                  name="dPass"
                  type="password"
                  placeholder="Defaults to password123"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Create Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Delete Vehicle &amp; User Account?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete vehicle{' '}
                  <strong className="text-slate-900 font-mono-tabular">
                    {userToDelete.vehicle_number}
                  </strong>{' '}
                  ({userToDelete.name})?
                </p>
                {userToDelete.id === currentAdmin.id && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                    ⚠️ <strong>Notice:</strong> You are deleting your currently logged-in account. You will be logged out immediately once deleted.
                  </div>
                )}
                <p className="text-[11px] text-rose-600 font-medium pt-1">
                  This will permanently delete this driver profile, login credentials, and all recorded trip income &amp; expense history from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => handleDeleteUser(userToDelete)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
