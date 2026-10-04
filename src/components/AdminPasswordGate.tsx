import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AdminPasswordGateProps {
  onSuccess: () => void;
  onCancel: () => void;
  isModal?: boolean;
}

export const AdminPasswordGate: React.FC<AdminPasswordGateProps> = ({
  onSuccess,
  onCancel,
  isModal = false,
}) => {
  const { t, isBangla } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanInput = password.trim();

    // Check against required password ADMIN123 (accepts uppercase or lowercase)
    if (cleanInput.toUpperCase() === 'ADMIN123') {
      try {
        sessionStorage.setItem('fleet_admin_unlocked', 'true');
      } catch {}
      setIsSubmitting(false);
      onSuccess();
    } else {
      setIsSubmitting(false);
      setError(isBangla ? 'ভুল অ্যাডমিন পাসওয়ার্ড! অ্যাক্সেস দেওয়া হয়নি।' : 'Invalid Admin Password. Access Denied.');
    }
  };

  const content = (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Icon & Title */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {t('adminGateTitle')}
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {t('adminGateSubtitle')}
        </p>
      </div>

      {/* Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t('adminPasswordLabel')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={isBangla ? 'পাসওয়ার্ড লিখুন...' : 'Enter password...'}
              className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono-tabular tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('cancelBtn')}</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('unlockAdmin')}</span>
          </button>
        </div>
      </form>

      <div className="pt-3 border-t border-slate-100 text-center">
        <span className="text-[10px] text-slate-400">
          {isBangla
            ? 'ফ্লিটলেজার অ্যাডমিনিস্ট্রেটর অ্যাক্সেস কন্ট্রোল দ্বারা সুরক্ষিত'
            : 'Protected by FleetLedger Administrator Access Control'}
        </span>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      {content}
    </div>
  );
};
