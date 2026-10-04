import React, { useEffect, useState } from 'react';
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

function FleetLedgerApp() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AppTab>('ledger');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fleet_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(false);
  const { isBangla } = useLanguage();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        // Clear admin section for everyone by default: always land on daily ledger
        setActiveTab('ledger');
        // Log in login_history
        await supabase.from('login_history').insert({ user_id: userId });
      } else {
        console.warn('Profile not found:', error);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      const currentSession = data?.session;
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: any) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('fleet_admin_unlocked');
    } catch {}
    setIsAdminUnlocked(false);
    setShowAdminPasswordModal(false);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const handleOpenAdminPasswordModal = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin');
    } else {
      setShowAdminPasswordModal(true);
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    try {
      sessionStorage.removeItem('fleet_admin_unlocked');
    } catch {}
    if (activeTab === 'admin') {
      setActiveTab('ledger');
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

  // Not authenticated
  if (!session || !profile) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header with Menu Bar */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAdminPasswordModal={handleOpenAdminPasswordModal}
        onLockAdmin={handleLockAdmin}
        onPrint={() => window.print()}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'admin' ? (
          isAdminUnlocked ? (
            <AdminView
              currentAdmin={profile}
              onLogout={handleLogout}
              onLockAdmin={handleLockAdmin}
            />
          ) : (
            <AdminPasswordGate
              onSuccess={() => {
                setIsAdminUnlocked(true);
                setShowAdminPasswordModal(false);
              }}
              onCancel={() => {
                setActiveTab('ledger');
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
