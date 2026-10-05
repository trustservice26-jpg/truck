import React, { useState } from 'react';
import { DailyRecord } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { Edit2, Trash2, Search, FileText, MessageSquare, Calendar, Download } from 'lucide-react';

interface RecordTableProps {
  records: DailyRecord[];
  onEdit?: (record: DailyRecord) => void;
  onDelete?: (recordId: string) => void;
  onShareWhatsApp?: (date: string) => void;
  onExportAllCSV?: () => void;
  canEdit?: boolean;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  records,
  onEdit,
  onDelete,
  onShareWhatsApp,
  onExportAllCSV,
  canEdit = true,
}) => {
  const { t, isBangla } = useLanguage();
  const [search, setSearch] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredRecords = records.filter(r => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.record_date.toLowerCase().includes(term) ||
      (r.cost_details || '').toLowerCase().includes(term) ||
      (r.other_details || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header bar with count, search and backup CSV action */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{t('ledgerTitle')}</h3>
          <p className="text-xs text-slate-500">
            {t('showingRecords')}{' '}
            <span className="font-mono-tabular font-medium">{filteredRecords.length}</span> /{' '}
            <span className="font-mono-tabular font-medium">{records.length}</span> {t('totalEntries')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
          {onExportAllCSV && (
            <button
              onClick={onExportAllCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shrink-0 shadow-2xs"
              title="Export all financial records to CSV to backup offline"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('backupCsv')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {filteredRecords.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No records found for this period</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try clearing your search query.' : 'Log a new daily entry using the form above.'}
            </p>
          </div>
        ) : (
          filteredRecords.map(r => {
            const balance = (Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0);
            const isPositive = balance >= 0;

            return (
              <div key={r.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                {/* Header: Date + Balance Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDisplayDate(r.record_date)}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono-tabular ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    Net: {formatCurrency(balance)}
                  </span>
                </div>

                {/* 3-Col Stats Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Income</span>
                    <span className="font-semibold text-emerald-700 font-mono-tabular">
                      {formatCurrency(r.income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Fuel / Cost</span>
                    <span className="font-semibold text-amber-700 font-mono-tabular">
                      {formatCurrency(r.cost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Other</span>
                    <span className="font-semibold text-slate-700 font-mono-tabular">
                      {formatCurrency(r.other)}
                    </span>
                  </div>
                </div>

                {/* Subtext notes if present */}
                {(r.cost_details || r.other_details) && (
                  <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                    {r.cost_details && (
                      <div className="whitespace-pre-line break-words">
                        <span className="font-bold text-slate-900 block mb-0.5">
                          {isBangla ? 'খরচের বিবরণ:' : 'Cost Details:'}
                        </span>
                        {r.cost_details}
                      </div>
                    )}
                    {r.other_details && (
                      <div className="whitespace-pre-line break-words pt-1 border-t border-slate-200/70">
                        <span className="font-bold text-slate-900 block mb-0.5">
                          {isBangla ? 'অন্যান্য বিবরণ:' : 'Other Details:'}
                        </span>
                        {r.other_details}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Toolbar */}
                {canEdit && (
                  <div className="pt-1 flex items-center justify-between border-t border-slate-100 no-print">
                    {confirmDeleteId === r.id ? (
                      <div className="flex items-center gap-2 w-full justify-end animate-fadeIn">
                        <span className="text-xs text-rose-600 font-medium">Delete record?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(r.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded font-bold hover:bg-rose-700 transition-colors shadow-xs"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-xs bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        {onShareWhatsApp ? (
                          <button
                            type="button"
                            onClick={() => onShareWhatsApp(r.record_date)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(r)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-blue-600" />
                              <span>Edit</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(r.id);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop / Tablet Table container (hidden on mobile, visible on >= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-28">{t('dateCol')}</th>
              <th className="py-3 px-4 text-right w-44">{t('incomeCol')}</th>
              <th className="py-3 px-4 text-right w-36">{t('costCol')}</th>
              <th className="py-3 px-4 text-right w-44">{t('otherCol')}</th>
              <th className="py-3 px-4 text-right w-36">{t('balanceCol')}</th>
              {canEdit && <th className="py-3 px-4 text-center w-20 no-print">{t('actionsCol')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">{t('noRecords')}</p>
                    <p className="text-xs text-slate-400">
                      {search ? t('tryClearingSearch') : t('logNewEntryPrompt')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map(r => {
                const balance = (Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0);
                const isPositive = balance >= 0;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono-tabular font-bold text-slate-900 whitespace-nowrap align-top">
                      {formatDisplayDate(r.record_date)}
                    </td>

                    {/* Income */}
                    <td className="py-3 px-4 text-right align-top">
                      <div className="font-mono-tabular font-semibold text-emerald-700">
                        {formatCurrency(r.income)}
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-4 text-right align-top">
                      <div className="font-mono-tabular font-semibold text-red-600">
                        {formatCurrency(r.cost)}
                      </div>
                      {r.cost_details && (
                        <div className="text-xs text-slate-600 mt-1 max-w-[240px] ml-auto whitespace-pre-line leading-relaxed text-right">
                          {r.cost_details}
                        </div>
                      )}
                    </td>

                    {/* Other */}
                    <td className="py-3 px-4 text-right align-top">
                      <div className="font-mono-tabular font-semibold text-red-600">
                        {formatCurrency(r.other)}
                      </div>
                      {r.other_details && (
                        <div className="text-xs text-slate-600 mt-1 max-w-[220px] ml-auto whitespace-pre-line leading-relaxed text-right">
                          {r.other_details}
                        </div>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right align-top">
                      <div
                        className={`font-mono-tabular font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(balance)}
                      </div>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="py-3 px-4 text-center align-top no-print whitespace-nowrap">
                        {confirmDeleteId === r.id ? (
                          <div className="flex items-center justify-center gap-1.5 animate-fadeIn">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(r.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 text-[11px] bg-rose-600 text-white rounded font-bold hover:bg-rose-700 transition-colors shadow-xs"
                              title="Confirm delete"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-[11px] bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition-colors"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {onShareWhatsApp && (
                              <button
                                type="button"
                                onClick={() => onShareWhatsApp(r.record_date)}
                                title="Share this day on WhatsApp"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(r)}
                                title="Edit record"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(r.id);
                                }}
                                title="Delete record"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
