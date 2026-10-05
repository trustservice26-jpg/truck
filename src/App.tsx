import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { Profile } from './types';
import { AuthView } from './components/AuthView';
import { UserView } from './components/UserView';
import { AdminView } from './components/AdminView';
import { Header, AppTab } from './components/Header';
import { PdfGenerateView } from './components/PdfGenerateView';
import { MonthlyOverview } from './components/MonthlyOverview';
import { AdminPasswordGate } from './components/AdminPasswordGate';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ArrowLeft, Shield, Lock, Truck } from 'lucide-react';

const STANDALONE_ADMIN_PROFILE: Profile = {
  id: 'admin-master-portal',
  vehicle_number: 'ADMIN',
  name: 'Fleet Administrator',
  phone: '',
  role: 'admin',
};

function FleetLedgerApp() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTabState] = useState<AppTab>('ledger');
  const [tabHistory, setTabHistory] = useState<AppTab[]>([]);
  const [adminHasSelectedUser, setAdminHasSelectedUser] = useState<boolean>(false);
  const [adminBackSignal, setAdminBackSignal] = useState<number>(0);
  const [standaloneAdminMode, setStandaloneAdminMode] = useState<boolean>(false);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fleet_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(false);
  const [pendingStandaloneAdmin, setPendingStandaloneAdmin] = useState<boolean>(false);
  const { isBangla } = useLanguage();

  const setActiveTab = useCallback(
    (nextTab: AppTab) => {
      setActiveTabState(prev => {
        if (prev !== nextTab) {
          setTabHistory(h => [...h, prev]);
          try {
            window.history.pushState({ fleetInternal: true, tab: nextTab }, '');
          } catch {}
        }
        return nextTab;
      });
    },
    []
  );

  // Determine whether there is an internal view to go back to inside our website
  const canGoBack =
    adminHasSelectedUser || standaloneAdminMode || activeTab !== 'ledger';

  const handleInAppBack = useCallback(() => {
    if (adminHasSelectedUser) {
      setAdminBackSignal(s => s + 1);
      setAdminHasSelectedUser(false);
      return;
    }
    if (standaloneAdminMode) {
      setStandaloneAdminMode(false);
      return;
    }
    if (tabHistory.length > 0) {
      const nextHistory = [...tabHistory];
      const prevTab = nextHistory.pop() || 'ledger';
      setTabHistory(nextHistory);
      setActiveTabState(prevTab);
      return;
    }
    if (activeTab !== 'ledger') {
      setActiveTabState('ledger');
    }
  }, [adminHasSelectedUser, standaloneAdminMode, tabHistory, activeTab]);

  // Keep a ref to latest back handler for browser/mobile hardware popstate interception
  const backHandlerRef = useRef(handleInAppBack);
  const canGoBackRef = useRef(canGoBack);
  useEffect(() => {
    backHandlerRef.current = handleInAppBack;
    canGoBackRef.current = canGoBack;
  }, [handleInAppBack, canGoBack]);

  // Clean mobile history & BFCache handling so pressing Back or closing/reopening on any phone never freezes
  useEffect(() => {
    const onPopState = () => {
      if (canGoBackRef.current) {
        backHandlerRef.current();
      }
    };

    // Recover cleanly if mobile browser restores page from Back-Forward Cache (BFCache) after closing/cutting tab
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false);
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const fetchProfile = async (userId: string, fallbackUser?: Profile) => {
    if (fallbackUser && fallbackUser.vehicle_number) {
      setProfile(fallbackUser);
      setLoading(false);
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        setActiveTabState('ledger');
        setTabHistory([]);
        supabase.from('login_history').insert({ user_id: userId }).then(() => {});
      } else if (!fallbackUser) {
        console.warn('Profile not found:', error);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setLoading(false);
    }, 3500);

    supabase.auth.getSession().then(({ data }: any) => {
      const currentSession = data?.session;
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: any) => {
        setSession(newSession);
        if (newSession?.user) {
          setStandaloneAdminMode(false);
          setActiveTabState('ledger');
          setTabHistory([]);
          fetchProfile(newSession.user.id, newSession.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(bootTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('fleet_admin_unlocked');
    } catch {}
    setIsAdminUnlocked(false);
    setShowAdminPasswordModal(false);
    setStandaloneAdminMode(false);
    setAdminHasSelectedUser(false);
    setTabHistory([]);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const handleOpenAdminPasswordModal = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin');
    } else {
      setPendingStandaloneAdmin(false);
      setShowAdminPasswordModal(true);
    }
  };

  const handleOpenAdminFromLogin = () => {
    if (isAdminUnlocked) {
      setStandaloneAdminMode(true);
      try {
        window.history.pushState({ fleetInternal: true, standaloneAdmin: true }, '');
      } catch {}
    } else {
      setPendingStandaloneAdmin(true);
      setShowAdminPasswordModal(true);
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setAdminHasSelectedUser(false);
    try {
      sessionStorage.removeItem('fleet_admin_unlocked');
    } catch {}
    if (standaloneAdminMode) {
      setStandaloneAdminMode(false);
    }
    if (activeTab === 'admin') {
      setActiveTabState('ledger');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">
            {isBangla ? 'ফ্লিটলেজার লোড হচ্ছে...' : 'Loading FleetLedger...'}
          </span>
        </div>
      </div>
    );
  }

  // Standalone Admin Fleet Management view opened directly from the Login page
  if ((!session || !profile) && standaloneAdminMode && isAdminUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
        <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 no-print shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleInAppBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBangla ? 'পেছনে যান' : 'Back'}</span>
              </button>
              <div className="flex items-center gap-1.5 truncate">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span className="font-black text-sm sm:text-lg tracking-wider truncate">
                  FLEET-LEDGER
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded hidden xs:inline-block">
                  {isBangla ? 'অ্যাডমিন পোর্টাল' : 'Admin Portal'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLockAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-lg transition-colors shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isBangla ? 'লগইন পেজে ফিরুন' : 'Exit to Log In'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1">
          <AdminView
            currentAdmin={STANDALONE_ADMIN_PROFILE}
            onLogout={handleLockAdmin}
            onLockAdmin={handleLockAdmin}
            onSubViewChange={setAdminHasSelectedUser}
            backSignal={adminBackSignal}
          />
        </main>
      </div>
    );
  }

  // Not authenticated
  if (!session || !profile) {
    return (
      <>
        <AuthView onOpenAdminFleetManagement={handleOpenAdminFromLogin} />
        {showAdminPasswordModal && (
          <AdminPasswordGate
            isModal={true}
            onSuccess={() => {
              setIsAdminUnlocked(true);
              setShowAdminPasswordModal(false);
              if (pendingStandaloneAdmin) {
                setStandaloneAdminMode(true);
                setPendingStandaloneAdmin(false);
              }
            }}
            onCancel={() => {
              setShowAdminPasswordModal(false);
              setPendingStandaloneAdmin(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header with Mobile Back Button (shown only when inside a sub-view, hidden at root) & Menu Bar */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAdminPasswordModal={handleOpenAdminPasswordModal}
        onLockAdmin={handleLockAdmin}
        onPrint={() => window.print()}
        canGoBack={canGoBack}
        onBack={handleInAppBack}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'admin' ? (
          isAdminUnlocked ? (
            <AdminView
              currentAdmin={profile}
              onLogout={handleLogout}
              onLockAdmin={handleLockAdmin}
              onSubViewChange={setAdminHasSelectedUser}
              backSignal={adminBackSignal}
            />
          ) : (
            <AdminPasswordGate
              onSuccess={() => {
                setIsAdminUnlocked(true);
                setShowAdminPasswordModal(false);
              }}
              onCancel={() => {
                setActiveTabState('ledger');
                setShowAdminPasswordModal(false);
              }}
            />
          )
        ) : activeTab === 'pdf' ? (
          <PdfGenerateView profile={profile} />
        ) : activeTab === 'overview' ? (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <MonthlyOverview userId={profile.id} vehicleNumber={profile.vehicle_number} />
          </div>
        ) : (
          <UserView
            profile={profile}
            activeTab="ledger"
            onNavigateToPdf={() => setActiveTab('pdf')}
            onNavigateToOverview={() => setActiveTab('overview')}
          />
        )}
      </main>

      {/* Modal Dialog for Admin Password Prompt */}
      {showAdminPasswordModal && !isAdminUnlocked && (
        <AdminPasswordGate
          isModal={true}
          onSuccess={() => {
            setIsAdminUnlocked(true);
            setShowAdminPasswordModal(false);
            setActiveTab('admin');
          }}
          onCancel={() => {
            setShowAdminPasswordModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <FleetLedgerApp />
    </LanguageProvider>
  );
}
