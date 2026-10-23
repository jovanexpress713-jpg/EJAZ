/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: +967771119726
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Trip, 
  Customer, 
  Driver, 
  Truck, 
  MaintenanceRecord, 
  CollectionRecord, 
  ExpenseRecord, 
  CompanySettings, 
  AuditLog, 
  AppNotification 
} from './types';
import { StorageService } from './services/storage';
import { SyncEngine } from './services/syncEngine';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { Header, NavigationTabs } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TripsView } from './components/TripsView';
import { CustomersView } from './components/CustomersView';
import { DriversView } from './components/DriversView';
import { DriverTrackingLedgerView } from './components/DriverTrackingLedgerView';
import { TrucksView } from './components/TrucksView';
import { MaintenanceView } from './components/MaintenanceView';
import { FinancialView } from './components/FinancialView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AdminMonitorView } from './components/AdminMonitorView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { printTripWaybill, shareTripViaWhatsApp } from './utils/tripActions';
import { SYSTEM_INFO } from './constants/systemInfo';
import { AboutSystemModal } from './components/AboutSystemModal';
import { MobileSavePointsModal } from './components/MobileSavePointsModal';
import { DailyHandoverModal } from './components/DailyHandoverModal';
import { Phone } from 'lucide-react';

export default function App() {
  // App Stage: 'SPLASH' | 'LOGIN' | 'MAIN'
  const [appStage, setAppStage] = useState<'SPLASH' | 'LOGIN' | 'MAIN'>('SPLASH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => StorageService.getTheme());

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isGlobalSavePointsOpen, setIsGlobalSavePointsOpen] = useState(false);
  const [isGlobalDailyHandoverOpen, setIsGlobalDailyHandoverOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Application Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(StorageService.getSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Selected Trip for detailed view from other tabs
  const [selectedTripToView, setSelectedTripToView] = useState<Trip | null>(null);
  const [isQuickTripAddOpen, setIsQuickTripAddOpen] = useState(false);

  // Safe navigation handler (uppercase normalization)
  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab.toUpperCase());
  }, []);

  // Theme switcher
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    StorageService.setTheme(nextTheme);
    if (typeof document !== 'undefined') {
      const isDark = nextTheme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark', isDark);
    }
  };

  // Sync theme with DOM
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark', isDark);
    }
  }, [theme]);

  // Load all data from StorageService
  const refreshData = useCallback(() => {
    setTrips(StorageService.getTrips());
    setCustomers(StorageService.getCustomers());
    setDrivers(StorageService.getDrivers());
    setTrucks(StorageService.getTrucks());
    setMaintenance(StorageService.getMaintenance());
    setCollections(StorageService.getCollections());
    setExpenses(StorageService.getExpenses());
    setSettings(StorageService.getSettings());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
  }, []);

  // Initial load check & Unlimited Storage Hydration
  useEffect(() => {
    // Mandatorily enforce 1-to-1 driver to truck binding across all existing records
    StorageService.enforceStrictOneDriverOneTruckBinding();
    refreshData();
    const storedUser = StorageService.getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    // Subscribe to background IndexedDB hydration for unlimited storage
    const unsubscribe = StorageService.onDataHydrated(() => {
      StorageService.enforceStrictOneDriverOneTruckBinding();
      refreshData();
      const user = StorageService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    });

    // Subscribe to real-time central server sync updates
    const unsubscribeSync = StorageService.onSyncUpdate(() => {
      refreshData();
    });

    // Automatic background multi-device synchronization cycle (every 10 seconds)
    const runBackgroundSync = () => {
      SyncEngine.syncWithServer(StorageService.getCurrentUser()).catch(() => {});
    };
    runBackgroundSync();
    const syncInterval = setInterval(runBackgroundSync, 10000);

    const handleWindowOnline = () => {
      runBackgroundSync();
    };
    window.addEventListener('online', handleWindowOnline);

    // Check URL query parameters for direct trip link
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tripCode = urlParams.get('trip');
        if (tripCode) {
          const currentTrips = StorageService.getTrips();
          const targetTrip = currentTrips.find(t => t.tripNumber === tripCode || t.id === tripCode);
          if (targetTrip) {
            setSelectedTripToView(targetTrip);
            setActiveTab('TRIPS');
          }
        }
      } catch {
        // safe ignore
      }
    }

    return () => {
      unsubscribe();
      unsubscribeSync();
      clearInterval(syncInterval);
      window.removeEventListener('online', handleWindowOnline);
    };
  }, [refreshData]);

  // Handle Splash Screen finish
  const handleSplashFinish = () => {
    const storedUser = StorageService.getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setAppStage('MAIN');
    } else {
      setAppStage('LOGIN');
    }
  };

  // Handle Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAppStage('MAIN');
    refreshData();
  };

  // Handle Logout
  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setAppStage('LOGIN');
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = () => {
    StorageService.markAllNotificationsAsRead();
    refreshData();
  };

  // Navigate to trip view
  const handleViewTrip = (trip: Trip) => {
    setSelectedTripToView(trip);
    setActiveTab('TRIPS');
  };

  // Quick Add Trip
  const handleOpenQuickTripModal = () => {
    setIsQuickTripAddOpen(true);
    setActiveTab('TRIPS');
  };

  // Print Waybill
  const handlePrintWaybill = (trip: Trip) => {
    printTripWaybill(trip, settings);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (trip: Trip) => {
    shareTripViaWhatsApp(trip);
  };

  // Render current stage
  if (appStage === 'SPLASH') {
    return (
      <div 
        id="ejaz-app-root" 
        className={`ejaz-app-root min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo transition-colors duration-200`} 
        dir="rtl"
      >
        <SplashScreen onFinish={handleSplashFinish} />
      </div>
    );
  }

  if (appStage === 'LOGIN' || !currentUser) {
    return (
      <div 
        id="ejaz-app-root" 
        className={`ejaz-app-root min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo transition-colors duration-200`} 
        dir="rtl"
      >
        <LoginScreen onLogin={handleLogin} onLoginSuccess={handleLogin} />
      </div>
    );
  }

  const currentTabUpper = activeTab.toUpperCase();

  return (
    <div 
      id="ejaz-app-root" 
      className={`ejaz-app-root min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo transition-colors duration-200`} 
      dir="rtl"
    >
      {/* Persistent App Header */}
      <Header
        currentUser={currentUser}
        activeTab={currentTabUpper}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        setActiveTab={handleNavigate}
        onNavigate={handleNavigate}
        notifications={notifications}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onOpenQuickTripModal={handleOpenQuickTripModal}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenSavePoints={() => setIsGlobalSavePointsOpen(true)}
        onOpenDailyHandover={() => setIsGlobalDailyHandoverOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Navigation Sub-bar */}
      <NavigationTabs 
        activeTab={currentTabUpper} 
        onSelectTab={handleNavigate} 
        setActiveTab={handleNavigate} 
        currentUser={currentUser}
      />

      {/* Main Body Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 mb-8">
        {currentTabUpper === 'DASHBOARD' && (
          <DashboardView
            trips={trips}
            customers={customers}
            drivers={drivers}
            trucks={trucks}
            maintenance={maintenance}
            collections={collections}
            expenses={expenses}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onNavigateTab={handleNavigate}
            onViewTrip={handleViewTrip}
            onPrintWaybill={handlePrintWaybill}
            onShareWhatsApp={handleShareWhatsApp}
            onOpenAddTrip={handleOpenQuickTripModal}
          />
        )}

        {currentTabUpper === 'ADMIN_MONITOR' && (
          <AdminMonitorView
            currentUser={currentUser}
            trips={trips}
            collections={collections}
            expenses={expenses}
            auditLogs={auditLogs}
            settings={settings}
            onRefreshData={refreshData}
            onNavigateToTrip={handleViewTrip}
          />
        )}

        {currentTabUpper === 'TRIPS' && (
          <TripsView
            trips={trips}
            customers={customers}
            drivers={drivers}
            trucks={trucks}
            currentUser={currentUser}
            onRefresh={refreshData}
            initialSelectedTrip={selectedTripToView}
            initialAddOpen={isQuickTripAddOpen}
            onCloseInitialAdd={() => setIsQuickTripAddOpen(false)}
            onPrintWaybill={handlePrintWaybill}
            onShareWhatsApp={handleShareWhatsApp}
            onNavigateToDriverTracking={() => handleNavigate('DRIVER_TRACKING')}
          />
        )}

        {currentTabUpper === 'CUSTOMERS' && (
          <CustomersView
            customers={customers}
            trips={trips}
            currentUser={currentUser}
            onRefresh={refreshData}
            onViewTrip={handleViewTrip}
          />
        )}

        {currentTabUpper === 'DRIVERS' && (
          <DriversView
            drivers={drivers}
            trucks={trucks}
            trips={trips}
            currentUser={currentUser}
            settings={settings}
            onRefresh={refreshData}
          />
        )}

        {(currentTabUpper === 'DRIVER_TRACKING' || currentTabUpper === 'LOCATIONS') && (
          <DriverTrackingLedgerView
            trips={trips}
            drivers={drivers}
            trucks={trucks}
            currentUser={currentUser}
            onRefresh={refreshData}
            onNavigateToTrips={() => handleNavigate('TRIPS')}
          />
        )}

        {currentTabUpper === 'TRUCKS' && (
          <TrucksView
            trucks={trucks}
            drivers={drivers}
            trips={trips}
            maintenance={maintenance}
            expenses={expenses}
            currentUser={currentUser}
            onRefresh={refreshData}
            onNavigateToMaintenance={() => handleNavigate('MAINTENANCE')}
          />
        )}

        {currentTabUpper === 'MAINTENANCE' && (
          <MaintenanceView
            maintenance={maintenance}
            trucks={trucks}
            currentUser={currentUser}
            onRefresh={refreshData}
          />
        )}

        {(currentTabUpper === 'FINANCIAL' || currentTabUpper === 'EXPENSES' || currentTabUpper === 'COLLECTIONS') && (
          <FinancialView
            collections={collections}
            expenses={expenses}
            trips={trips}
            customers={customers}
            currentUser={currentUser}
            onRefresh={refreshData}
            initialSubTab={currentTabUpper === 'EXPENSES' ? 'EXPENSES' : 'COLLECTIONS'}
          />
        )}

        {currentTabUpper === 'REPORTS' && (
          <ReportsView
            trips={trips}
            customers={customers}
            drivers={drivers}
            trucks={trucks}
            maintenance={maintenance}
            collections={collections}
            expenses={expenses}
            currentUser={currentUser}
            onRefresh={refreshData}
          />
        )}

        {currentTabUpper === 'SETTINGS' && (
          <SettingsView
            settings={settings}
            auditLogs={auditLogs}
            currentUser={currentUser}
            onRefresh={refreshData}
            onOpenAbout={() => setIsAboutModalOpen(true)}
          />
        )}
      </main>

      {/* Persistent Official Footer matching Reference Design */}
      <footer className="bg-[#070E1E] text-slate-400 py-3 sm:py-4 px-3 sm:px-6 select-none no-print border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto">
          {/* Outer Rounded Container with Deep Navy Background and Blue Border */}
          <div 
            className="bg-[#081225] border border-blue-900/60 rounded-2xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shadow-xl"
            dir="rtl"
          >
            {/* RIGHT SIDE: 1. Logo (Ejaz ERP) & 2. Copyright Info */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* 1. شعار إيجاز ERP مع الأيقونة الهندسية الذهبية */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Golden Isometric Hexagon Emblem */}
                <svg viewBox="0 0 44 44" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M22 3L39 12.5V31.5L22 41L5 31.5V12.5L22 3Z" 
                    stroke="#F59E0B" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  <path 
                    d="M5 31.5L22 41L39 31.5" 
                    stroke="#D97706" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  <path 
                    d="M8 35.5L22 43L36 35.5" 
                    stroke="#B45309" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    opacity="0.6" 
                  />
                  <path d="M12 29V23L16 20V29H12Z" fill="#F59E0B" />
                  <path d="M19 29V17L23 14V29H19Z" fill="#FBBF24" />
                  <path d="M26 29V11L30 8V29H26Z" fill="#F59E0B" />
                </svg>

                {/* Typography: مؤسسة إيجاز للنقليات */}
                <div className="flex flex-col text-right leading-none justify-center">
                  <span className="text-white font-black text-base sm:text-lg tracking-tight">مؤسسة إيجـاز للنقليات</span>
                  <span className="text-amber-400 font-bold text-[10px] sm:text-[11px] tracking-wider mt-0.5 font-mono">EJAZ TRANSPORT ERP</span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-8 w-px bg-slate-700/80 hidden sm:block shrink-0" />

              {/* 2. نص نظام التشغيل وحقوق الشركة المنتجة */}
              <div className="flex flex-col text-right leading-tight">
                <span className="text-slate-200 font-bold text-xs sm:text-[13px]">نظام VICTORIA Logistics ERP المعتمد</span>
                <span className="text-amber-400 font-semibold text-xs sm:text-[12px] mt-0.5">تطوير: فكتوريا لاين سوفت للأنظمة والبرمجة</span>
              </div>
            </div>

            {/* LEFT SIDE: 3. Version & About trigger & 4. Phone Number */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* 3. قسم حول النظام ورقم الإصدار V2.6.0 PRO */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAboutModalOpen(true)}
                  className="text-slate-200 hover:text-white font-bold text-xs sm:text-[13px] transition cursor-pointer"
                  title="عرض تفاصيل ترخيص وحماية النظام"
                >
                  حول النظام
                </button>

                {/* Golden Version Badge */}
                <div className="px-3 py-1 rounded-full border border-amber-500/90 text-amber-400 font-bold font-mono text-xs sm:text-[13px] tracking-wide bg-amber-500/10 shadow-xs">
                  V{SYSTEM_INFO.version} PRO
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-8 w-px bg-slate-700/80 hidden sm:block shrink-0" />

              {/* 4. كبسولة رقم التواصل +967771119726 مع أيقونة الهاتف الذهبية */}
              <a
                href={SYSTEM_INFO.developer.contactUrl}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-blue-500/50 hover:border-blue-400 bg-blue-950/40 hover:bg-blue-900/60 text-white font-mono font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                dir="ltr"
                title="اتصال مباشر بالشركة المطورة"
              >
                <Phone className="w-4 h-4 text-amber-400 fill-current shrink-0" />
                <span className="tracking-wider">{SYSTEM_INFO.developer.contactNumber}</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* About System & Development Rights Modal */}
      <AboutSystemModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Global Mobile Save Points Modal (نقاط الحفظ للجوال) */}
      <MobileSavePointsModal
        isOpen={isGlobalSavePointsOpen}
        onClose={() => setIsGlobalSavePointsOpen(false)}
        trips={trips}
        drivers={drivers}
        trucks={trucks}
        customers={customers}
        collections={collections}
        expenses={expenses}
        currentUser={currentUser}
        settings={settings}
      />

      {/* Global Daily Handover Modal (محضر التسليم النهاري للمالك) */}
      <DailyHandoverModal
        isOpen={isGlobalDailyHandoverOpen}
        onClose={() => setIsGlobalDailyHandoverOpen(false)}
        trips={trips}
        drivers={drivers}
        trucks={trucks}
        customers={customers}
        collections={collections}
        expenses={expenses}
        currentUser={currentUser}
        settings={settings}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        currentUser={currentUser}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={(updated) => {
          setCurrentUser(updated);
          refreshData();
        }}
      />
    </div>
  );
}
