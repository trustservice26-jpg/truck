import React from 'react';
import { DatabaseView } from './DatabaseView';
import { X } from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs no-print overflow-y-auto">
      <div className="bg-slate-50 rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              FleetLedger Database &amp; SQL Architecture
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-1 sm:p-3">
          <DatabaseView onBack={onClose} />
        </div>
      </div>
    </div>
  );
};
