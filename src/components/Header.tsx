import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Shield,
  FileText,
  BookOpen,
  BarChart3,
  Truck,
  Menu,
  X,
  CheckCircle2,
  ChevronRight,
  Languages,
  Lock,
} from 'lucide-react';
import { Profile } from '../types';
import { useLanguage } from '../context/LanguageContext';

export type AppTab = 'ledger' | 'overview' | 'pdf' | 'admin';

interface HeaderProps {
  profile: Profile;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onLogout: () => void;
  isAdminUnlocked?: boolean;
  onOpenAdminPasswordModal?: () => void;
  onLockAdmin?: () => void;
  onOpenDatabaseModal?: () => void;
  onPrint?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  onLogout,
  isAdminUnlocked = false,
  onOpenAdminPasswordModal,
  onLockAdmin,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t, toggleLanguage, isBangla } = useLanguage();

  // Close menu on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSelectTab = (tab: AppTab) => {
    if (tab === 'admin' && !isAdminUnlocked && onOpenAdminPasswordModal) {
      setIsMenuOpen(false);
      onOpenAdminPasswordModal();
      return;
    }
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 no-print shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand & Vehicle Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('ledger')}
              className="text-left font-black text-base sm:text-xl tracking-wider text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Truck className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="inline font-black tracking-wider">FLEET-LEDGER</span>
            </button>
            <span className="text-[11px] font-mono-tabular px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold truncate max-w-[100px] sm:max-w-none">
              {profile.vehicle_number}
            </span>
            {activeTab !== 'admin' && (
              <span className="hidden sm:inline-flex items-center text-xs font-medium text-slate-400 pl-1">
                /
                <span className="ml-1 text-slate-700 font-semibold">
                  {activeTab === 'ledger' && t('dailyFinancialRecords')}
                  {activeTab === 'overview' && t('monthlyOverviewTitle')}
                  {activeTab === 'pdf' && t('generatePdfTab')}
                </span>
              </span>
            )}
          </div>

          {/* Right Corner Controls: Menu Bar Button + Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Corner Menu Button (Opens corner menu bar on click) */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-lg border transition-all shadow-xs ${
                  isMenuOpen
                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="Menu Bar: View all pages and tools"
                aria-label="Toggle Menu Bar"
              >
                {isMenuOpen ? (
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                ) : (
                  <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
                )}
                <span>{t('menu')}</span>
              </button>

              {/* Corner Menu Bar Dropdown Card */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-1.5 sm:mt-2 w-64 sm:w-80 max-w-[calc(100vw-16px)] bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-2 sm:p-3 space-y-1.5 sm:space-y-2.5 z-50 animate-fadeIn">
                  {/* Menu Bar Header with Vehicle & Profile */}
                  <div className="p-2 sm:p-2.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-lg sm:rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
                          {profile.vehicle_number}
                        </span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 bg-blue-500/30 text-blue-200 rounded border border-blue-400/30 uppercase">
                        {profile.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/10">
                      <span className="truncate">{t('driverName')}: {profile.name}</span>
                      {profile.phone && <span className="text-[10px] text-slate-400 shrink-0 ml-1">{profile.phone}</span>}
                    </div>
                  </div>

                  {/* Language Switch Row inside menu */}
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                      <Languages className="w-4 h-4 text-emerald-600" />
                      <span>{isBangla ? 'ভাষা: বাংলা (৳ টাকা)' : 'Language: English (৳ Taka)'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleLanguage}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded text-xs font-bold text-emerald-900 transition-colors shadow-2xs"
                    >
                      {isBangla ? 'English' : 'বাংলা'}
                    </button>
                  </div>

                  {/* Menu Bar Navigation Items */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isBangla ? 'মেনু ও নেভিগেশন' : 'Navigation'}
                    </div>

                    {/* 1. Daily Financial Records */}
                    <button
                      onClick={() => handleSelectTab('ledger')}
                      className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-left transition-all ${
                        activeTab === 'ledger'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md sm:rounded-lg bg-blue-100 text-blue-700 shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{t('dailyFinancialRecords')}</div>
                          <div className="hidden sm:block text-[10px] text-slate-500 truncate">
                            {isBangla ? 'দৈনিক ট্রিপ ভাড়া, জ্বালানি ও টোল খরচ লিপিবদ্ধ করুন' : 'Log daily revenue, fuel refill & toll costs'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {/* 2. Monthly Overview */}
                    <button
                      onClick={() => handleSelectTab('overview')}
                      className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-left transition-all ${
                        activeTab === 'overview'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md sm:rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{t('monthlyOverviewTab')}</div>
                          <div className="hidden sm:block text-[10px] text-slate-500 truncate">
                            {isBangla ? 'মাসিক আয় বনাম খরচের বিশ্লেষণ ও গ্রাফ' : 'Recharts visual comparison of income vs expenses'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {/* 3. Generate PDF */}
                    <button
                      onClick={() => handleSelectTab('pdf')}
                      className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-left transition-all ${
                        activeTab === 'pdf'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md sm:rounded-lg bg-purple-100 text-purple-700 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{t('generatePdfTab')}</div>
                          <div className="hidden sm:block text-[10px] text-slate-500 truncate">
                            {isBangla ? 'অফিসিয়াল লেজার বিবরণী ও অডিট রিপোর্ট' : 'Official ledger statements with summary audits'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {/* 4. Fleet Management Section */}
                    <button
                      onClick={() => handleSelectTab('admin')}
                      className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-left transition-all ${
                        activeTab === 'admin'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md sm:rounded-lg bg-amber-100 text-amber-800 shrink-0">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                            <span>{t('fleetAdminTab')}</span>
                            {!isAdminUnlocked ? (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-100/90 text-amber-900 rounded font-medium flex items-center gap-0.5 border border-amber-300">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{t('protectedBadge')}</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-medium flex items-center gap-0.5 border border-emerald-300">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{t('unlockedBadge')}</span>
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:block text-[10px] text-slate-500 truncate">
                            {t('fleetAdminDesc')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {/* Quick Lock Admin button if currently unlocked */}
                    {isAdminUnlocked && onLockAdmin && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onLockAdmin();
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-50/80 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>{t('lockAdminSection')}</span>
                          </span>
                          <span className="text-[10px] text-amber-700 font-mono">{t('protectedBadge')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Menu Bar Footer / Logout */}
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg sm:rounded-xl transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Logout button on Header */}
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              title="Logout from vehicle session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
