import { DailyRecord } from '../types';

export function formatCurrency(amount: number | string | undefined | null, symbol = '৳'): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getFirstDayOfMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function getLastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: firstDayLastMonth.toISOString().slice(0, 10),
    to: lastDayLastMonth.toISOString().slice(0, 10),
  };
}

export function getLast7DaysRange(): { from: string; to: string } {
  const now = new Date();
  const past7 = new Date();
  past7.setDate(now.getDate() - 7);
  return {
    from: past7.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`; // e.g. "30 Sep 2026"
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function exportRecordsToCSV(
  records: DailyRecord[],
  vehicleNumber: string,
  driverName: string,
  from: string,
  to: string
) {
  const headers = [
    'Date',
    'Vehicle Number',
    'Driver',
    'Income (৳)',
    'Income Details',
    'Cost (৳)',
    'Cost Location',
    'Cost Details',
    'Other (৳)',
    'Other Details',
    'Net Balance (৳)',
  ];

  const escapeVal = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = records.map(r => {
    const balance = (Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0);
    return [
      escapeVal(r.record_date),
      escapeVal(vehicleNumber),
      escapeVal(driverName),
      (Number(r.income) || 0).toFixed(2),
      escapeVal(r.income_details || ''),
      (Number(r.cost) || 0).toFixed(2),
      escapeVal(r.cost_location || ''),
      escapeVal(r.cost_details || ''),
      (Number(r.other) || 0).toFixed(2),
      escapeVal(r.other_details || ''),
      balance.toFixed(2),
    ].join(',');
  });

  const totals = records.reduce(
    (acc, r) => ({
      income: acc.income + (Number(r.income) || 0),
      cost: acc.cost + (Number(r.cost) || 0),
      other: acc.other + (Number(r.other) || 0),
    }),
    { income: 0, cost: 0, other: 0 }
  );
  const totalBalance = totals.income - totals.cost - totals.other;

  const summaryRow = [
    '"TOTAL"',
    escapeVal(vehicleNumber),
    escapeVal(driverName),
    totals.income.toFixed(2),
    '""',
    totals.cost.toFixed(2),
    '""',
    '""',
    totals.other.toFixed(2),
    '""',
    totalBalance.toFixed(2),
  ].join(',');

  const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FleetLedger_${vehicleNumber}_${from}_to_${to}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportCsvOptions {
  vehicleNumber?: string;
  driverName?: string;
  filenamePrefix?: string;
  isFleetMaster?: boolean;
}

/**
 * Exports ALL financial records into an offline backup CSV spreadsheet file.
 * Includes complete fields, properly escaped values, UTF-8 BOM for Excel, and summary totals.
 */
export function exportAllFinancialRecordsToCSV(
  records: DailyRecord[],
  options: ExportCsvOptions = {}
): { success: boolean; count: number; filename: string } {
  const vehicleNumber = options.vehicleNumber || 'ALL_VEHICLES';
  const driverName = options.driverName || 'ALL_DRIVERS';
  const today = getTodayStr();

  const headers = [
    'Record ID',
    'Date',
    'Vehicle Number',
    'Driver',
    'Income (৳)',
    'Income Details',
    'Direct Cost / Fuel (৳)',
    'Cost / Fuel Location',
    'Cost Details',
    'Other Expense (৳)',
    'Other Details',
    'Total Operating Expenses (৳)',
    'Net Profit / Balance (৳)',
    'Profit Margin (%)',
    'Created Timestamp'
  ];

  const escapeVal = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = records.map(r => {
    const income = Number(r.income) || 0;
    const cost = Number(r.cost) || 0;
    const other = Number(r.other) || 0;
    const totalExpenses = cost + other;
    const balance = income - totalExpenses;
    const margin = income > 0 ? ((balance / income) * 100).toFixed(1) + '%' : '0.0%';

    return [
      escapeVal(r.id),
      escapeVal(r.record_date),
      escapeVal(vehicleNumber),
      escapeVal(driverName),
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

  const totals = records.reduce(
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
    escapeVal('OFFLINE BACKUP TOTALS'),
    escapeVal(`${records.length} Total Records`),
    escapeVal(vehicleNumber),
    escapeVal(driverName),
    totals.income.toFixed(2),
    escapeVal('Sum of all income'),
    totals.cost.toFixed(2),
    escapeVal(''),
    escapeVal('Sum of direct costs'),
    totals.other.toFixed(2),
    escapeVal('Sum of other expenses'),
    totalExpenses.toFixed(2),
    totalBalance.toFixed(2),
    escapeVal(totalMargin),
    escapeVal(`Exported ${new Date().toISOString()}`)
  ].join(',');

  const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanVehicle = vehicleNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = options.filenamePrefix
    ? `${options.filenamePrefix}_${today}.csv`
    : `FleetLedger_BACKUP_${cleanVehicle}_${today}_all_records.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, count: records.length, filename };
}
