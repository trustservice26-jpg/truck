import React, { useState, useMemo } from 'react';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { buildWhatsAppMessage, openWhatsAppShare } from '../utils/whatsappGenerator';
import { formatDisplayDate, getTodayStr } from '../utils/formatters';
import { X, Send, Copy, Check, MessageSquare, Calendar, FileText, CheckCircle2, Phone } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  records: DailyRecord[];
  totals: RecordTotals;
  from: string;
  to: string;
  defaultSingleDate?: string;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  profile,
  records,
  totals,
  from,
  to,
  defaultSingleDate,
}) => {
  const [scope, setScope] = useState<'period' | 'today' | 'single'>(
    defaultSingleDate ? 'single' : 'period'
  );
  const [singleDate, setSingleDate] = useState<string>(defaultSingleDate || getTodayStr());
  const [detailLevel, setDetailLevel] = useState<'summary' | 'detailed'>('summary');
  const [includeVehicleInfo, setIncludeVehicleInfo] = useState<boolean>(true);
  const [includeCostDetails, setIncludeCostDetails] = useState<boolean>(true);
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.record_date))).sort().reverse();
    return dates;
  }, [records]);

  const { message, scopedCount, url } = useMemo(() => {
    return buildWhatsAppMessage({
      profile,
      records,
      totals,
      from,
      to,
      scope,
      singleDate,
      detailLevel,
      includeVehicleInfo,
      includeCostDetails,
      recipientPhone,
    });
  }, [
    profile,
    records,
    totals,
    from,
    to,
    scope,
    singleDate,
    detailLevel,
    includeVehicleInfo,
    includeCostDetails,
    recipientPhone,
  ]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleSend = () => {
    openWhatsAppShare(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-emerald-600 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">Share on WhatsApp</h3>
              <p className="text-[11px] sm:text-xs text-emerald-100">
                Send vehicle settlement statement directly via WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* 1. Selection: Report Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Select Report Period to Share:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setScope('period')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'period'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Full Period</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-mono-tabular">
                  {formatDisplayDate(from)} to {formatDisplayDate(to)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('today')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'today'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Today Only</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                  {formatDisplayDate(getTodayStr())}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('single')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'single'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Specific Date</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Choose specific day
                </div>
              </button>
            </div>

            {/* If Single Date selected */}
            {scope === 'single' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <span className="text-xs font-medium text-slate-700">Choose Date:</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono-tabular"
                />
                {availableDates.length > 0 && (
                  <select
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                  >
                    <option value="">Recent recorded dates...</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>
                        {formatDisplayDate(d)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* 2. Selection: Detail Level */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Select Message Detail Level:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  detailLevel === 'summary'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="detailLevel"
                  checked={detailLevel === 'summary'}
                  onChange={() => setDetailLevel('summary')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold block">Executive Summary</span>
                  <span className="text-[11px] text-slate-500">
                    Total income, fuel costs, and running expenses. Compact &amp; quick to read.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  detailLevel === 'detailed'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="detailLevel"
                  checked={detailLevel === 'detailed'}
                  onChange={() => setDetailLevel('detailed')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold block">Itemized Breakdown</span>
                  <span className="text-[11px] text-slate-500">
                    Includes summary + full date-by-date list of earnings, fuel, costs, and notes.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Selection: Optional Inclusions & Recipient */}
          <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              3. Custom Inclusions:
            </span>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeVehicleInfo}
                  onChange={e => setIncludeVehicleInfo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Vehicle &amp; Driver Info</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCostDetails}
                  onChange={e => setIncludeCostDetails(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Cost Details (Fuel / Liters)</span>
              </label>
            </div>

            {/* Recipient phone */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>Recipient WhatsApp Number (Optional):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="e.g. +14155552671 (leave empty to pick in WhatsApp)"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: Leave blank to open WhatsApp and pick any contact, fleet manager, or chat group.
              </p>
            </div>
          </div>

          {/* 4. Live Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Message Preview ({scopedCount} {scopedCount === 1 ? 'entry' : 'entries'})</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="bg-[#EFEAE2] p-3 sm:p-4 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-900 max-h-40 sm:max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              <div className="bg-white p-3 rounded-lg shadow-xs max-w-full">
                {message}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors text-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
