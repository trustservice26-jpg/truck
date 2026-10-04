import React, { useState, useEffect } from 'react';
import { DailyRecord } from '../types';
import { getTodayStr, formatCurrency } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { Check, AlertCircle } from 'lucide-react';

interface RecordFormProps {
  onSave: (record: Omit<DailyRecord, 'id' | 'created_at'>) => Promise<string | null>;
  editingRecord: DailyRecord | null;
  onCancelEdit: () => void;
  userId: string;
}

export const RecordForm: React.FC<RecordFormProps> = ({
  onSave,
  editingRecord,
  onCancelEdit,
  userId,
}) => {
  const { t, isBangla } = useLanguage();
  const [date, setDate] = useState<string>(getTodayStr());
  const [income, setIncome] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [costDetails, setCostDetails] = useState<string>('');
  const [other, setOther] = useState<string>('');
  const [otherDetails, setOtherDetails] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.record_date);
      setIncome(editingRecord.income > 0 ? String(editingRecord.income) : '');
      setCost(editingRecord.cost > 0 ? String(editingRecord.cost) : '');
      setCostDetails(editingRecord.cost_details || '');
      setOther(editingRecord.other > 0 ? String(editingRecord.other) : '');
      setOtherDetails(editingRecord.other_details || '');
    } else {
      clearForm();
    }
  }, [editingRecord]);

  const clearForm = () => {
    setDate(getTodayStr());
    setIncome('');
    setCost('');
    setCostDetails('');
    setOther('');
    setOtherDetails('');
    setStatusMessage(null);
  };

  const parsedIncome = Number(income) || 0;
  const parsedCost = Number(cost) || 0;
  const parsedOther = Number(other) || 0;
  const netDailyProfit = parsedIncome - parsedCost - parsedOther;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setStatusMessage({ text: isBangla ? 'অনুগ্রহ করে সঠিক তারিখ নির্বাচন করুন।' : 'Please select a valid date.', type: 'error' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const payload = {
      user_id: userId,
      record_date: date,
      income: parsedIncome,
      income_details: editingRecord?.income_details || '',
      cost: parsedCost,
      cost_location: '',
      cost_details: costDetails.trim(),
      other: parsedOther,
      other_details: otherDetails.trim(),
    };

    const error = await onSave(payload);
    setLoading(false);

    if (error) {
      setStatusMessage({ text: error, type: 'error' });
    } else {
      setStatusMessage({
        text: editingRecord ? t('recordUpdatedSuccess') : t('recordSavedSuccess'),
        type: 'success',
      });
      if (!editingRecord) {
        clearForm();
      }
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Quick preset helper
  const applyQuickTemplate = (template: {
    inc: string;
    cst: string;
    cstDet?: string;
    oth: string;
    othDet?: string;
  }) => {
    setIncome(template.inc);
    setCost(template.cst);
    if (template.cstDet) setCostDetails(template.cstDet);
    setOther(template.oth);
    if (template.othDet) setOtherDetails(template.othDet);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{editingRecord ? t('editDailyRecord') : t('newDailyEntry')}</span>
            {editingRecord && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                {isBangla ? 'সম্পাদনা মোড' : 'Editing Mode'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('formSubtext')}
          </p>
        </div>

        {/* Quick suggestions - horizontally scrollable on mobile */}
        {!editingRecord && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar text-xs">
            <span className="text-[11px] text-slate-400 font-medium shrink-0">{t('presets')}</span>
            <button
              type="button"
              onClick={() =>
                applyQuickTemplate({
                  inc: '3500',
                  cst: '900',
                  cstDet: isBangla ? 'ডিজেল ৩৫ লিটার' : 'Diesel 35 Liters',
                  oth: '150',
                  othDet: isBangla ? 'টার্মিনাল টোল ও পার্কিং' : 'Terminal parking fee',
                })
              }
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0"
            >
              {t('presetShuttle')}
            </button>
            <button
              type="button"
              onClick={() =>
                applyQuickTemplate({
                  inc: '7500',
                  cst: '2200',
                  cstDet: isBangla ? 'হাইওয়ে ডিজেল রিফিল' : 'Highway diesel refill',
                  oth: '350',
                  othDet: isBangla ? 'পদ্মা সেতু / এক্সপ্রেসওয়ে টোল' : 'Expressway toll barrier fee',
                })
              }
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors shrink-0"
            >
              {t('presetFreight')}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Record Date */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('recordDate')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors"
            />
          </div>

          {/* Income Amount */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('dailyIncomeField')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-semibold">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={income}
                onChange={e => setIncome(e.target.value)}
                className="w-full text-sm pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors font-medium"
              />
            </div>
          </div>

          {/* Fuel / Cost Amount */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('costField')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-semibold">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="w-full text-sm pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors font-medium"
              />
            </div>
          </div>

          {/* Other Amount */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('otherCostField')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-semibold">৳</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={other}
                onChange={e => setOther(e.target.value)}
                className="w-full text-sm pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors font-medium"
              />
            </div>
          </div>

          {/* Cost Details - For Fuel, Vendors & Maintenance */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isBangla ? 'জ্বালানি/তেল খরচের বিবরণ' : 'Cost Details'}
            </label>
            <input
              type="text"
              placeholder={t('fuelNotes')}
              value={costDetails}
              onChange={e => setCostDetails(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Other Details */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isBangla ? 'টোল ও অন্যান্য খরচের বিবরণ' : 'Other Details'}
            </label>
            <input
              type="text"
              placeholder={t('otherNotes')}
              value={otherDetails}
              onChange={e => setOtherDetails(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Live Calculation Preview Strip */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-slate-600 font-bold">{isBangla ? 'নিট হিসাব:' : 'Net Preview:'}</span>
            <span className="text-slate-700">
              {isBangla ? 'আয়' : 'Inc'}: <strong className="font-mono-tabular text-emerald-700">{formatCurrency(parsedIncome)}</strong>
            </span>
            <span className="text-slate-400">−</span>
            <span className="text-slate-700">
              {isBangla ? 'তেল' : 'Cost'}: <strong className="font-mono-tabular text-amber-700">{formatCurrency(parsedCost)}</strong>
            </span>
            <span className="text-slate-400">−</span>
            <span className="text-slate-700">
              {isBangla ? 'অন্যান্য' : 'Oth'}: <strong className="font-mono-tabular text-indigo-700">{formatCurrency(parsedOther)}</strong>
            </span>
            <span className="text-slate-400">=</span>
            <span
              className={`font-mono-tabular font-bold px-2 py-0.5 rounded ${
                netDailyProfit >= 0
                  ? 'text-emerald-700 bg-emerald-100/70'
                  : 'text-rose-700 bg-rose-100/70'
              }`}
            >
              {formatCurrency(netDailyProfit)}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <button
              type="button"
              onClick={clearForm}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-center"
            >
              {isBangla ? 'মুছুন' : 'Clear'}
            </button>
            {editingRecord && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors text-center"
              >
                {t('cancelBtn')}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>{isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingRecord ? t('updateRecord') : t('saveRecord')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </form>
    </div>
  );
};
