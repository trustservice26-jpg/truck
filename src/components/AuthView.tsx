import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Truck, UserPlus, LogIn, Languages, Shield, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import bannerImage from '../assets/images/fleet_ledger_banner_1790516387387.jpg';

interface AuthViewProps {
  onOpenDatabaseModal?: () => void;
  onOpenAdminFleetManagement?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onOpenAdminFleetManagement }) => {
  const { t, toggleLanguage, isBangla } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);

  // Intercept mobile hardware back button when in Register tab so it returns to Login instead of leaving the website
  useEffect(() => {
    if (isRegister) {
      try {
        window.history.pushState({ authSubView: 'register' }, '');
      } catch {}
    }
    const handlePopState = () => {
      if (isRegister) {
        setIsRegister(false);
        setMessage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isRegister]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleRegisterNumber, setVehicleRegisterNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const email = `${vehicleNumber.trim().toLowerCase()}@vehicle.local`;

    try {
      if (isRegister) {
        if (!name.trim()) {
          setMessage({
            text: isBangla ? 'অনুগ্রহ করে চালক বা মালিকের নাম লিখুন।' : 'Please enter driver or owner name.',
            type: 'error',
          });
          setLoading(false);
          return;
        }
        if (!vehicleNumber.trim()) {
          setMessage({
            text: isBangla ? 'অনুগ্রহ করে লগইন নম্বর (Log in Number) দিন।' : 'Please enter Log in Number.',
            type: 'error',
          });
          setLoading(false);
          return;
        }
        if (!vehicleRegisterNumber.trim()) {
          setMessage({
            text: isBangla ? 'অনুগ্রহ করে গাড়ির রেজিস্ট্রেশন নম্বর (Vehicle register Number) দিন।' : 'Please enter Vehicle register Number.',
            type: 'error',
          });
          setLoading(false);
          return;
        }
        if (!password || password.length < 4) {
          setMessage({
            text: isBangla ? 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.',
            type: 'error',
          });
          setLoading(false);
          return;
        }

        const res = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              vehicle_number: vehicleNumber.trim().toUpperCase(),
              vehicle_register_number: vehicleRegisterNumber.trim().toUpperCase(),
              name: name.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (res.error) {
          setMessage({ text: res.error.message, type: 'error' });
        } else {
          setMessage({
            text: isBangla ? 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! লগইন করা হচ্ছে...' : 'Account created successfully! Logging you in...',
            type: 'success',
          });
        }
      } else {
        if (!vehicleNumber.trim()) {
          setMessage({
            text: isBangla ? 'অনুগ্রহ করে লগইন নম্বর (Log in Number) লিখুন।' : 'Please enter your Log in Number.',
            type: 'error',
          });
          setLoading(false);
          return;
        }

        const res = await supabase.auth.signInWithPassword({
          email,
          password: password || 'password',
        });

        if (res.error) {
          setMessage({ text: res.error.message, type: 'error' });
        }
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'Authentication error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:py-12 px-3 sm:px-6 lg:px-8 relative">
      {/* Mobile Back Button (Shown ONLY when in Register sub-view, hidden on root Login view so it never exits to external site) */}
      {isRegister && (
        <div className="fixed top-4 left-4 z-20 md:hidden">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setMessage(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>{isBangla ? 'লগইনে ফিরুন' : 'Back'}</span>
          </button>
        </div>
      )}

      {/* Language Switcher in top corner */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs transition-colors"
          title={isBangla ? 'Switch to English' : 'বাংলায় রূপান্তর করুন'}
        >
          <Languages className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isBangla ? 'বাংলা (৳)' : 'English (৳)'}</span>
        </button>
      </div>

      {/* Top Banner & Header info */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-2">
          <Truck className="w-7 h-7 text-blue-600 inline" />
          <span>{t('appTitle')}</span>
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          {t('appSubtitle')}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-10 shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
          {/* Hero Fleet Visual Header */}
          <div className="relative -mx-4 -mt-6 sm:-mx-10 sm:-mt-8 mb-5 h-32 sm:h-36 overflow-hidden bg-slate-900">
            <img
              src={bannerImage}
              alt="Commercial vehicle fleet operations"
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex items-end p-4 sm:p-5">
              <div className="text-white">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                  {isBangla ? 'ফ্লিট ট্রান্সপোর্ট খতিয়ান' : 'Fleet Transport Ledger'}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {isBangla ? 'দৈনিক আয় ও ব্যয় হিসাব খতিয়ান (৳ টাকা)' : 'Driver Earnings & Expense Ledger (৳)'}
                </h2>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setMessage(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                !isRegister
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isBangla ? 'লগইন (LOG IN)' : 'LOG IN'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setMessage(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                isRegister
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isBangla ? 'নতুন অ্যাকাউন্ট নিবন্ধন (Register)' : 'Register'}</span>
            </button>
          </div>

          {/* Main Form */}
          <form className="space-y-3.5" onSubmit={handleAuth}>
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isBangla ? 'চালক / মালিকের পুরো নাম' : 'Driver / Owner Full Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমনঃ মোঃ রফিকুল ইসলাম' : 'e.g. Marcus Chen'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isBangla ? 'গাড়ির রেজিস্ট্রেশন নম্বর (Vehicle register Number)' : 'Vehicle register Number'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমনঃ ঢাকা মেট্রো-গ ১২-৩৪৫৬' : 'e.g. DHAKA-METRO-GA-12-3456'}
                    value={vehicleRegisterNumber}
                    onChange={e => setVehicleRegisterNumber(e.target.value.toUpperCase())}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular uppercase font-semibold transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isBangla ? 'আপনার গাড়ির অফিসিয়াল নিবন্ধন বা লাইসেন্স প্লেট নম্বর' : 'Official commercial vehicle license plate / registration number'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isBangla ? 'মোবাইল ফোন নম্বর (ঐচ্ছিক)' : 'Contact Phone Number (Optional)'}
                  </label>
                  <input
                    type="tel"
                    placeholder={isBangla ? 'যেমনঃ ০১৭১১-XXXXXX' : 'e.g. +880 1711-XXXXXX'}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBangla ? 'লগইন নম্বর (Log in Number)' : 'Log in Number'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  isRegister
                    ? (isBangla ? 'লগইন নম্বর লিখুন (যেমনঃ 1483)' : 'Enter Log in Number (e.g. 1483)')
                    : (isBangla ? 'লগইন নম্বর লিখুন' : 'Enter Log in Number')
                }
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono-tabular uppercase font-semibold transition-colors"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {isRegister
                  ? (isBangla ? 'এই লগইন নম্বরটি দিয়ে পরবর্তীতে অ্যাকাউন্টে সাইন ইন করবেন' : 'This Log in Number will be used to log in to your account')
                  : (isBangla ? 'লগইন করতে আপনার নির্ধারিত নম্বর প্রবেশ করান' : 'Enter your registered Log in Number to sign in')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBangla ? 'পাসওয়ার্ড' : 'Password'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  message.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRegister ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isBangla ? 'গাড়ির অ্যাকাউন্ট নিবন্ধন করুন' : 'Register Vehicle Account'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isBangla ? 'গাড়ির খতিয়ানে প্রবেশ করুন' : 'Access Vehicle Ledger'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Fleet Management Box Bar Under Login Page */}
        {onOpenAdminFleetManagement && (
          <div className="mt-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-3.5 sm:p-4 shadow-lg text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white">
                    {isBangla ? 'অ্যাডমিন ফ্লিট ম্যানেজমেন্ট' : 'Admin Fleet Management'}
                  </span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
                    {isBangla ? 'সুরক্ষিত' : 'Protected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {isBangla
                    ? 'সকল নিবন্ধিত গাড়ি, চালকের হিসাব ও অডিট পরিচালনা করুন'
                    : 'Manage all registered vehicles, driver ledgers & fleet audits'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAdminFleetManagement}
              className="px-3 sm:px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isBangla ? 'প্রবেশ করুন' : 'Open'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
