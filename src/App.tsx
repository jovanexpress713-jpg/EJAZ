/*
 * Copyright © فكتوريا لاين سوفت للأنظمة والبرمجة
 * All Rights Reserved.
 * Developed and Programmed by Victoria Line Soft
 * Contact: 771119726
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
import { printTripWaybill, shareTripViaWhatsApp } from './utils/tripActions';
import { SYSTEM_INFO } from './constants/systemInfo';
import { AboutSystemModal } from './components/AboutSystemModal';
import { MobileSavePointsModal } from './components/MobileSavePointsModal';
import { DailyHandoverModal } from './components/DailyHandoverModal';

export default function App() {
  // App Stage: 'SPLASH' | 'LOGIN' | 'MAIN'
  const [appStage, setAppStage] = useState<'SPLASH' | 'LOGIN' | 'MAIN'>('SPLASH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isGlobalSavePointsOpen, setIsGlobalSavePointsOpen] = useState(false);
  const [isGlobalDailyHandoverOpen, setIsGlobalDailyHandoverOpen] = useState(false);

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
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (appStage === 'LOGIN' || !currentUser) {
    return <LoginScreen onLogin={handleLogin} onLoginSuccess={handleLogin} />;
  }

  const currentTabUpper = activeTab.toUpperCase();

  return (
    <div id="ejaz-app-root" className="min-h-screen bg-slate-100 flex flex-col font-cairo" dir="rtl">
      {/* Persistent App Header */}
      <Header
        currentUser={currentUser}
        activeTab={currentTabUpper}
        setActiveTab={handleNavigate}
        onNavigate={handleNavigate}
        notifications={notifications}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onOpenQuickTripModal={handleOpenQuickTripModal}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenSavePoints={() => setIsGlobalSavePointsOpen(true)}
        onOpenDailyHandover={() => setIsGlobalDailyHandoverOpen(true)}
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

        {currentTabUpper === 'DRIVER_TRACKING' && (
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

        {currentTabUpper === 'FINANCIAL' && (
          <FinancialView
            collections={collections}
            expenses={expenses}
            trips={trips}
            customers={customers}
            currentUser={currentUser}
            onRefresh={refreshData}
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

      {/* Persistent Official Footer */}
      <footer className="bg-[#0F172A] text-slate-400 py-3.5 sm:py-4 text-xs border-t border-slate-800 select-none no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right">
          {/* Official Required Copyright Statement */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 sm:gap-1.5 text-[11px] sm:text-xs leading-relaxed">
            <span className="text-slate-200 font-bold">
              نظام إيجاز © جميع الحقوق محفوظة
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400">
              تطوير وبرمجة{' '}
              <strong className="text-orange-400 font-bold hover:text-orange-300 transition">
                {SYSTEM_INFO.developer.fullName}
              </strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href={SYSTEM_INFO.developer.contactUrl}
              className="font-mono font-bold text-amber-400 hover:text-amber-300 transition px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700 inline-block text-[11px]"
              dir="ltr"
              title="اتصال مباشر بالشركة المطورة"
            >
              {SYSTEM_INFO.developer.contactNumber}
            </a>
          </div>

          {/* Left Side: System Version & About Trigger */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-slate-800 text-orange-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">
              v{SYSTEM_INFO.version} PRO
            </span>
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              className="text-slate-400 hover:text-white hover:underline transition px-2 py-1 rounded cursor-pointer"
            >
              حول النظام
            </button>
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
    </div>
  );
}
