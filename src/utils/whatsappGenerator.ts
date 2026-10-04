import { DailyRecord, Profile, RecordTotals } from '../types';
import { formatCurrency, formatDisplayDate, getTodayStr } from './formatters';

export interface WhatsAppShareOptions {
  profile: Profile;
  records: DailyRecord[];
  totals: RecordTotals;
  from: string;
  to: string;
  scope: 'period' | 'today' | 'single';
  singleDate?: string;
  detailLevel: 'summary' | 'detailed';
  includeVehicleInfo?: boolean;
  includeCostDetails?: boolean;
  recipientPhone?: string;
}

export function buildWhatsAppMessage(options: WhatsAppShareOptions): {
  message: string;
  scopedCount: number;
  url: string;
} {
  const {
    profile,
    records,
    totals,
    from,
    to,
    scope,
    singleDate,
    detailLevel,
    includeVehicleInfo = true,
    includeCostDetails = true,
    recipientPhone = '',
  } = options;

  const todayStr = getTodayStr();
  let targetRecords: DailyRecord[] = [];
  let periodLabel = '';

  if (scope === 'today') {
    targetRecords = records.filter(r => r.record_date === todayStr);
    periodLabel = `Today (${formatDisplayDate(todayStr)})`;
  } else if (scope === 'single' && singleDate) {
    targetRecords = records.filter(r => r.record_date === singleDate);
    periodLabel = formatDisplayDate(singleDate);
  } else {
    targetRecords = records;
    periodLabel = `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
  }

  // Calculate totals for target records
  const subTotals = targetRecords.reduce(
    (acc, r) => ({
      income: acc.income + (Number(r.income) || 0),
      cost: acc.cost + (Number(r.cost) || 0),
      other: acc.other + (Number(r.other) || 0),
    }),
    { income: 0, cost: 0, other: 0 }
  );

  const lines: string[] = [];

  lines.push('📋 *FLEETLEDGER STATEMENT*');
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (includeVehicleInfo) {
    if (profile.vehicle_number) {
      lines.push(`🚗 *Vehicle:* ${profile.vehicle_number}`);
    }
    if (profile.name) {
      lines.push(`👤 *Driver:* ${profile.name}`);
    }
  }

  lines.push(`📅 *Period:* ${periodLabel}`);
  lines.push('');

  lines.push('💰 *FINANCIAL TOTALS:*');
  lines.push(`• *Total Income:* ${formatCurrency(subTotals.income)}`);
  lines.push(`• *Fuel / Costs:* ${formatCurrency(subTotals.cost)}`);
  lines.push(`• *Other Expenses:* ${formatCurrency(subTotals.other)}`);

  if (detailLevel === 'detailed' && targetRecords.length > 0) {
    lines.push('');
    lines.push('📝 *DAILY BREAKDOWN:*');
    targetRecords.forEach((r, idx) => {
      const parts: string[] = [];
      parts.push(`*${idx + 1}. ${formatDisplayDate(r.record_date)}*`);
      parts.push(`   💵 Inc: ${formatCurrency(r.income)} | ⛽ Cost: ${formatCurrency(r.cost)}`);
      if (includeCostDetails && r.cost_details) {
        parts.push(`   🏷️ Details: _${r.cost_details}_`);
      }
      if (Number(r.other) > 0) {
        parts.push(`   🏷️ Other: ${formatCurrency(r.other)}`);
      }
      lines.push(parts.join('\n'));
    });
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📱 _Generated via FleetLedger Vehicle Manager_');

  const message = lines.join('\n');

  // Sanitize phone number for direct chat
  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  let url = '';
  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }

  return {
    message,
    scopedCount: targetRecords.length,
    url,
  };
}

export function openWhatsAppShare(url: string): void {
  // Use window.open with _blank for web & mobile WhatsApp handling
  window.open(url, '_blank', 'noopener,noreferrer');
}
